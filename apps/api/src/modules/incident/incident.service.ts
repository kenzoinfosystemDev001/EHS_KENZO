import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { OutboxService } from "../outbox/outbox.service";
import { WorkflowService } from "../workflow/workflow.service";
import { CreateIncidentDto } from "./dto/create-incident.dto";
import { IncidentActionDto } from "./dto/incident-action.dto";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { IncidentStatus, NotificationPriority } from "@prisma/client";
import { AccessScope } from "@kenzo-ehs/types";

import { SequenceAllocatorService } from "../../common/sequence/sequence-allocator.service";

const TX_CONFIG = { maxWait: 20000, timeout: 60000 };

@Injectable()
export class IncidentService {
  private readonly INCIDENT_TRANSITIONS: Record<
    string,
    Record<string, string>
  > = {
    [IncidentStatus.DRAFT]: {
      REPORT: IncidentStatus.REPORTED,
    },
    [IncidentStatus.REPORTED]: {
      CLASSIFY: IncidentStatus.CLASSIFIED,
      START_INVESTIGATION: IncidentStatus.INVESTIGATING,
      CLOSE: IncidentStatus.CLOSED,
      APPROVE_CLOSURE: IncidentStatus.CLOSED,
    },
    [IncidentStatus.CLASSIFIED]: {
      START_INVESTIGATION: IncidentStatus.INVESTIGATING,
      CLOSE: IncidentStatus.CLOSED,
      APPROVE_CLOSURE: IncidentStatus.CLOSED,
    },
    [IncidentStatus.INVESTIGATING]: {
      INITIATE_RCA: IncidentStatus.RCA_INITIATED,
      LINK_CAPA: IncidentStatus.CAPA_LINKED,
      REQUEST_CLOSURE: IncidentStatus.PENDING_CLOSURE,
      CLOSE: IncidentStatus.CLOSED,
      APPROVE_CLOSURE: IncidentStatus.CLOSED,
    },
    [IncidentStatus.RCA_INITIATED]: {
      LINK_CAPA: IncidentStatus.CAPA_LINKED,
      CLOSE: IncidentStatus.CLOSED,
      APPROVE_CLOSURE: IncidentStatus.CLOSED,
    },
    [IncidentStatus.CAPA_LINKED]: {
      REQUEST_CLOSURE: IncidentStatus.PENDING_CLOSURE,
      CLOSE: IncidentStatus.CLOSED,
      APPROVE_CLOSURE: IncidentStatus.CLOSED,
    },
    [IncidentStatus.PENDING_CLOSURE]: {
      APPROVE_CLOSURE: IncidentStatus.CLOSED,
      CLOSE: IncidentStatus.CLOSED,
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly workflowService: WorkflowService,
    private readonly sequenceAllocator: SequenceAllocatorService,
  ) {}

  async create(dto: CreateIncidentDto, user: AuthenticatedUserContext) {
    const plant = await this.prisma.plant.findFirst({
      where: { id: dto.plantId, organizationId: user.organizationId },
    });
    if (!plant)
      throw new BadRequestException("Plant not found or outside organization");
    this.assertPlantAccess(plant.id, user);

    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const referenceNumber = await this.sequenceAllocator.nextReferenceNumber(
        user.organizationId,
        "INCIDENT",
        `INC-${year}-${plant.code}`,
        4,
        tx,
      );

      const incident = await tx.incident.create({
        data: {
          organizationId: user.organizationId,
          plantId: plant.id,
          departmentId: dto.departmentId,
          areaId: dto.areaId ?? null,
          referenceNumber,
          title: dto.title,
          description: dto.description,
          incidentType: dto.incidentType,
          severity: dto.severity,
          status: IncidentStatus.REPORTED,
          incidentDate: new Date(dto.incidentDate),
          incidentTime: dto.incidentTime ?? null,
          location: dto.location ?? null,
          immediateActions: dto.immediateActions ?? null,
          isStatutoryRequired: dto.isStatutoryRequired ?? false,
          reportedById: user.id,
          submittedAt: new Date(),
        },
        include: {
          plant: { select: { id: true, code: true, name: true } },
          department: { select: { id: true, code: true, name: true } },
          reportedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      await this.workflowService.getOrCreateInstance(
        user.organizationId,
        "Incident",
        incident.id,
        IncidentStatus.REPORTED,
        "INCIDENT_STANDARD_V1",
        tx,
      );

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: plant.id,
        actorId: user.id,
        action: "INCIDENT.CREATE",
        entityType: "Incident",
        entityId: incident.id,
        afterState: {
          status: incident.status,
          referenceNumber: incident.referenceNumber,
        },
        reason: "Incident created and submitted for higher authority review",
        tx,
      });

      // Immediate in-app escalation to higher authorities: HSE Manager, Plant Head, Dept Head, Admin, Corporate HSE
      const higherAuthorityRoles = [
        "HSE_MANAGER",
        "PLANT_HEAD",
        "DEPARTMENT_HEAD",
        "ADMIN",
        "SYSTEM_ADMIN",
        "CORPORATE_HSE",
      ];
      const authorityUsers = await tx.user.findMany({
        where: {
          organizationId: user.organizationId,
          deletedAt: null,
          userRoles: {
            some: {
              role: {
                code: { in: higherAuthorityRoles },
              },
            },
          },
        },
        select: { id: true, email: true },
      });

      if (authorityUsers.length > 0) {
        await tx.notification.createMany({
          data: authorityUsers.map((auth) => ({
            userId: auth.id,
            title: `🚨 Incident Ticket: ${incident.referenceNumber} (${incident.severity})`,
            message: `A ${incident.severity} incident "${incident.title}" reported at ${plant.name}. Immediate higher authority investigation & intervention required.`,
            priority:
              incident.severity === "CRITICAL" || incident.severity === "CATASTROPHIC"
                ? NotificationPriority.URGENT
                : NotificationPriority.HIGH,
            channel: "IN_APP",
            linkUrl: `/incidents/${incident.id}`,
            entityType: "Incident",
            entityId: incident.id,
          })),
        });
      }

      // Confirmation notification to reporter
      await tx.notification.create({
        data: {
          userId: user.id,
          title: `Incident Ticket Registered: ${incident.referenceNumber}`,
          message: `Your incident ticket is now active and escalated to HSE Managers and Leadership for resolution.`,
          priority: NotificationPriority.HIGH,
          channel: "IN_APP",
          linkUrl: `/incidents/${incident.id}`,
          entityType: "Incident",
          entityId: incident.id,
        },
      });

      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: "INCIDENT",
        aggregateId: incident.id,
        eventType: "INCIDENT_CREATED",
        payload: {
          incidentId: incident.id,
          referenceNumber: incident.referenceNumber,
          severity: incident.severity,
          plantId: plant.id,
        },
        tx,
      });

      return incident;
    }, TX_CONFIG);
  }

  async findAll(user: AuthenticatedUserContext, plantId?: string, type?: string) {
    const isGlobal = user.roleScopes.some(
      (s) =>
        s.scope === AccessScope.SYSTEM ||
        s.scope === AccessScope.ORGANIZATION ||
        s.scope === AccessScope.ALL_PLANTS,
    );

    const where: any = { organizationId: user.organizationId, deletedAt: null };

    if (plantId) {
      this.assertPlantAccess(plantId, user);
      where.plantId = plantId;
    } else if (!isGlobal) {
      const allowedPlantIds = user.roleScopes
        .map((s) => s.plantId)
        .filter((id): id is string => Boolean(id));

      if (allowedPlantIds.length > 0) {
        where.OR = [
          { plantId: { in: allowedPlantIds } },
          { reportedById: user.id },
        ];
      } else {
        where.OR = [
          { organizationId: user.organizationId },
          { reportedById: user.id },
        ];
      }
    }

    if (type) {
      where.incidentType = type;
    }

    return this.prisma.incident.findMany({
      where,
      include: {
        plant: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
        reportedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        investigator: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        capaRecords: {
          select: { id: true, referenceNumber: true, status: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, user: AuthenticatedUserContext) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        plant: true,
        department: true,
        area: true,
        reportedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        investigator: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        injuries: true,
        witnesses: true,
        rcaStudies: {
          select: { id: true, referenceNumber: true, status: true },
        },
        capaRecords: {
          select: { id: true, referenceNumber: true, title: true, status: true, priority: true },
        },
      },
    });

    if (!incident || incident.organizationId !== user.organizationId) {
      throw new NotFoundException(`Incident [${id}] not found`);
    }

    // Reporters can always view their own reported incident
    if (incident.reportedById !== user.id) {
      this.assertPlantAccess(incident.plantId, user);
    }

    return incident;
  }

  async executeAction(
    id: string,
    action: string,
    user: AuthenticatedUserContext,
    dto: IncidentActionDto,
  ) {
    const incident = await this.findById(id, user);

    const currentState = incident.status;
    const transitions = this.INCIDENT_TRANSITIONS;
    const nextState = transitions[currentState]?.[action];
    if (!nextState) {
      throw new BadRequestException(
        `Action '${action}' is not valid from state '${currentState}'`,
      );
    }

    const statusUpdates: Record<string, any> = {
      status: nextState as IncidentStatus,
    };
    if (action === "REPORT") statusUpdates.submittedAt = new Date();
    if (action === "CLASSIFY") statusUpdates.classifiedAt = new Date();
    if (action === "START_INVESTIGATION") {
      statusUpdates.investigationStartedAt = new Date();
      if (!incident.investigatorId) {
        statusUpdates.investigatorId = user.id;
      }
    }
    if (action === "APPROVE_CLOSURE" || action === "CLOSE") {
      statusUpdates.closedAt = new Date();
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.incident.update({
        where: { id: incident.id },
        data: statusUpdates,
        include: {
          plant: { select: { id: true, code: true, name: true } },
          department: { select: { id: true, code: true, name: true } },
          reportedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
          investigator: { select: { id: true, email: true, firstName: true, lastName: true } },
          capaRecords: true,
        },
      });

      await this.workflowService.executeTransition(
        {
          entityType: "Incident",
          entityId: incident.id,
          action,
          actor: user,
          comments: dto.comments,
          tx,
          record: {
            id: incident.id,
            createdById: incident.reportedById,
            leadInvestigatorId: incident.investigatorId,
          },
        },
        transitions,
      );

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: incident.plantId,
        actorId: user.id,
        action: `INCIDENT.${action}`,
        entityType: "Incident",
        entityId: incident.id,
        beforeState: { status: currentState },
        afterState: { status: nextState },
        reason: dto.comments,
        tx,
      });

      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: "INCIDENT",
        aggregateId: incident.id,
        eventType: `INCIDENT_${action}`,
        payload: {
          incidentId: incident.id,
          referenceNumber: incident.referenceNumber,
          fromStatus: currentState,
          toStatus: nextState,
          actorId: user.id,
        },
        tx,
      });

      // Dispatch in-app notification to reporter about status progression & help provided
      if (incident.reportedById && incident.reportedById !== user.id) {
        await tx.notification.create({
          data: {
            userId: incident.reportedById,
            title: `Safety Ticket Update: ${incident.referenceNumber}`,
            message: `Status updated to ${nextState} by ${user.firstName} ${user.lastName}. ${dto.comments ? `Notes: ${dto.comments}` : ''}`,
            priority: action === "APPROVE_CLOSURE" || action === "CLOSE" ? NotificationPriority.MEDIUM : NotificationPriority.HIGH,
            channel: "IN_APP",
            linkUrl: `/incidents/${incident.id}`,
            entityType: "Incident",
            entityId: incident.id,
          },
        });
      }

      return updated;
    }, TX_CONFIG);
  }

  private assertPlantAccess(plantId: string, user: AuthenticatedUserContext) {
    const isGlobal = user.roleScopes.some(
      (s) =>
        s.scope === AccessScope.SYSTEM ||
        s.scope === AccessScope.ORGANIZATION ||
        s.scope === AccessScope.ALL_PLANTS,
    );
    if (isGlobal) return;
    const hasPlantConstraint = user.roleScopes.some((s) => Boolean(s.plantId));
    if (!hasPlantConstraint) return;

    const allowed = user.roleScopes.some(
      (s) =>
        (s.scope === AccessScope.OWN_PLANT && s.plantId === plantId) ||
        (s.scope === AccessScope.OWN_DEPARTMENT && s.plantId === plantId),
    );
    // Allow users to report incidents across plants within their organization
    if (!allowed && user.roleScopes.length > 0) {
      return;
    }
  }
}
