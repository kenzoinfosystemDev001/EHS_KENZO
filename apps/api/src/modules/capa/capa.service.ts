import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { OutboxService } from "../outbox/outbox.service";
import { WorkflowService } from "../workflow/workflow.service";
import { SequenceAllocatorService } from "../../common/sequence/sequence-allocator.service";
import { CreateCapaDto, CapaActionDto } from "./dto/capa.dto";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { CapaStatus } from "@prisma/client";
import { AccessScope } from "@kenzo-ehs/types";

const TX_CONFIG = { maxWait: 20000, timeout: 60000 };

@Injectable()
export class CapaService {
  private readonly TRANSITIONS: Record<string, Record<string, string>> = {
    [CapaStatus.OPEN]: { ASSIGN: CapaStatus.ASSIGNED },
    [CapaStatus.ASSIGNED]: { START: CapaStatus.IN_PROGRESS },
    [CapaStatus.IN_PROGRESS]: {
      SUBMIT_VERIFICATION: CapaStatus.PENDING_VERIFICATION,
    },
    [CapaStatus.PENDING_VERIFICATION]: {
      VERIFY: CapaStatus.VERIFIED,
      REWORK: CapaStatus.IN_PROGRESS,
    },
    [CapaStatus.VERIFIED]: { CLOSE: CapaStatus.CLOSED },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly workflowService: WorkflowService,
    private readonly sequenceAllocator: SequenceAllocatorService,
  ) {}

  async create(dto: CreateCapaDto, user: AuthenticatedUserContext) {
    const plant = await this.prisma.plant.findFirst({
      where: { id: dto.plantId, organizationId: user.organizationId },
    });
    if (!plant) throw new BadRequestException("Plant not found");

    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const referenceNumber = await this.sequenceAllocator.nextReferenceNumber(
        user.organizationId,
        "CAPA",
        `CAPA-${year}`,
        4,
        tx,
      );

      const dueDate = new Date();
      const daysByPriority = { CRITICAL: 7, HIGH: 14, MEDIUM: 30, LOW: 60 };
      dueDate.setDate(dueDate.getDate() + (daysByPriority[dto.priority] || 30));

      const capa = await tx.capaRecord.create({
        data: {
          organizationId: user.organizationId,
          plantId: plant.id,
          departmentId: dto.departmentId ?? null,
          referenceNumber,
          title: dto.title,
          description: dto.description,
          capaType: dto.capaType,
          priority: dto.priority,
          status: CapaStatus.OPEN,
          incidentId: dto.incidentId ?? null,
          rcaStudyId: dto.rcaStudyId ?? null,
          targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
          dueDate,
          createdById: user.id,
        },
      });

      await this.workflowService.getOrCreateInstance(
        user.organizationId,
        "CapaRecord",
        capa.id,
        CapaStatus.OPEN,
        "CAPA_STANDARD_V1",
        tx,
      );

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: plant.id,
        actorId: user.id,
        action: "CAPA.CREATE",
        entityType: "CapaRecord",
        entityId: capa.id,
        afterState: {
          status: capa.status,
          referenceNumber: capa.referenceNumber,
        },
        tx,
      });

      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: "CAPA",
        aggregateId: capa.id,
        eventType: "CAPA_CREATED",
        payload: {
          capaId: capa.id,
          referenceNumber: capa.referenceNumber,
          priority: capa.priority,
        },
        tx,
      });

      return capa;
    }, TX_CONFIG);
  }

  async findAll(user: AuthenticatedUserContext, plantId?: string) {
    const isGlobal = user.roleScopes.some(
      (s) =>
        s.scope === AccessScope.SYSTEM ||
        s.scope === AccessScope.ORGANIZATION ||
        s.scope === AccessScope.ALL_PLANTS,
    );
    const where: any = { organizationId: user.organizationId, deletedAt: null };
    if (!isGlobal) {
      where.plantId = {
        in: user.roleScopes
          .filter((s) => s.scope === AccessScope.OWN_PLANT && s.plantId)
          .map((s) => s.plantId!),
      };
    }
    if (plantId) where.plantId = plantId;

    return this.prisma.capaRecord.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        incident: { select: { id: true, referenceNumber: true } },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  async findById(id: string, user: AuthenticatedUserContext) {
    const capa = await this.prisma.capaRecord.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignedTo: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        verifications: {
          include: {
            verifiedBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        incident: { select: { id: true, referenceNumber: true } },
        rcaStudy: { select: { id: true, referenceNumber: true } },
        assignedTo: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!capa || capa.organizationId !== user.organizationId)
      throw new NotFoundException(`CAPA [${id}] not found`);
    return capa;
  }

  async executeAction(
    id: string,
    action: string,
    user: AuthenticatedUserContext,
    dto: CapaActionDto,
  ) {
    const capa = await this.findById(id, user);
    const nextState = this.TRANSITIONS[capa.status]?.[action];
    if (!nextState)
      throw new BadRequestException(
        `Action '${action}' invalid from state '${capa.status}'`,
      );

    return this.prisma.$transaction(async (tx) => {
      const updates: any = { status: nextState as CapaStatus };
      if (action === "ASSIGN") {
        if (!dto.assignedToId)
          throw new BadRequestException(
            "assignedToId is required for ASSIGN action",
          );
        updates.assignedToId = dto.assignedToId;
        updates.assignedAt = new Date();
      }
      if (action === "START") updates.startedAt = new Date();
      if (action === "VERIFY") {
        updates.verifiedById = user.id;
        updates.verifiedAt = new Date();
        updates.effectivenessRating = dto.effectivenessRating;
        updates.effectivenessNotes = dto.comments;
        await tx.capaVerification.create({
          data: {
            capaId: capa.id,
            verifiedById: user.id,
            verdict:
              dto.effectivenessRating && dto.effectivenessRating >= 4
                ? "EFFECTIVE"
                : dto.effectivenessRating && dto.effectivenessRating >= 2
                  ? "PARTIALLY_EFFECTIVE"
                  : "INEFFECTIVE",
            notes: dto.comments,
          },
        });
      }
      if (action === "CLOSE") {
        updates.closedById = user.id;
        updates.closedAt = new Date();
      }

      const updated = await tx.capaRecord.update({
        where: { id: capa.id },
        data: updates,
      });

      await this.workflowService.executeTransition(
        {
          entityType: "CapaRecord",
          entityId: capa.id,
          action,
          actor: user,
          comments: dto.comments,
          tx,
          record: {
            id: capa.id,
            createdById: capa.createdById,
            ownerId: capa.assignedToId,
          },
        },
        this.TRANSITIONS,
      );

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: capa.plantId,
        actorId: user.id,
        action: `CAPA.${action}`,
        entityType: "CapaRecord",
        entityId: capa.id,
        beforeState: { status: capa.status },
        afterState: { status: nextState },
        reason: dto.comments,
        tx,
      });

      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: "CAPA",
        aggregateId: capa.id,
        eventType: `CAPA_${action}`,
        payload: {
          capaId: capa.id,
          fromStatus: capa.status,
          toStatus: nextState,
          actorId: user.id,
        },
        tx,
      });

      return updated;
    }, TX_CONFIG);
  }
}
