import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { OutboxService } from "../outbox/outbox.service";
import { WorkflowService } from "../workflow/workflow.service";
import { CreatePtwDto, PtwActionDto } from "./dto/ptw.dto";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { PtwStatus } from "@prisma/client";
import { AccessScope } from "@kenzo-ehs/types";

const TX_CONFIG = { maxWait: 20000, timeout: 60000 };

@Injectable()
export class PtwService {
  private readonly TRANSITIONS: Record<string, Record<string, string>> = {
    [PtwStatus.DRAFT]: { SUBMIT: PtwStatus.SUBMITTED },
    [PtwStatus.SUBMITTED]: {
      SAFETY_REVIEW: PtwStatus.SAFETY_REVIEWED,
      REJECT: PtwStatus.REJECTED,
    },
    [PtwStatus.SAFETY_REVIEWED]: {
      APPROVE: PtwStatus.APPROVED,
      REJECT: PtwStatus.REJECTED,
    },
    [PtwStatus.APPROVED]: { ACTIVATE: PtwStatus.ACTIVE },
    [PtwStatus.ACTIVE]: {
      SUSPEND: PtwStatus.SUSPENDED,
      CLOSE: PtwStatus.CLOSED,
    },
    [PtwStatus.SUSPENDED]: {
      REACTIVATE: PtwStatus.ACTIVE,
      CLOSE: PtwStatus.CLOSED,
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly workflowService: WorkflowService,
  ) {}

  async create(dto: CreatePtwDto, user: AuthenticatedUserContext) {
    const plant = await this.prisma.plant.findFirst({
      where: { id: dto.plantId, organizationId: user.organizationId },
    });
    if (!plant) throw new BadRequestException("Plant not found");

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.permitToWork.count({
        where: { organizationId: user.organizationId, plantId: plant.id },
      });
      const year = new Date().getFullYear();
      const seq = String(count + 1).padStart(4, "0");
      const referenceNumber = `PTW-${year}-${plant.code}-${seq}`;

      const ptw = await tx.permitToWork.create({
        data: {
          organizationId: user.organizationId,
          plantId: plant.id,
          departmentId: dto.departmentId,
          areaId: dto.areaId ?? null,
          referenceNumber,
          title: dto.title,
          workDescription: dto.workDescription,
          category: dto.category,
          status: PtwStatus.DRAFT,
          requestedById: user.id,
          plannedStartDate: new Date(dto.plannedStartDate),
          plannedEndDate: new Date(dto.plannedEndDate),
          hazardsIdentified: dto.hazardsIdentified ?? null,
          precautions: dto.precautions ?? null,
          emergencyProcedures: dto.emergencyProcedures ?? null,
        },
        include: {
          plant: { select: { id: true, code: true, name: true } },
          department: { select: { id: true, code: true, name: true } },
          requestedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      await this.workflowService.getOrCreateInstance(
        user.organizationId,
        "PermitToWork",
        ptw.id,
        PtwStatus.DRAFT,
        "PTW_STANDARD_V1",
        tx,
      );

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: plant.id,
        actorId: user.id,
        action: "PTW.CREATE",
        entityType: "PermitToWork",
        entityId: ptw.id,
        afterState: {
          status: ptw.status,
          referenceNumber: ptw.referenceNumber,
        },
        tx,
      });

      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: "PTW",
        aggregateId: ptw.id,
        eventType: "PTW_CREATED",
        payload: {
          ptwId: ptw.id,
          referenceNumber: ptw.referenceNumber,
          category: ptw.category,
        },
        tx,
      });

      return ptw;
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

    return this.prisma.permitToWork.findMany({
      where,
      include: {
        plant: { select: { id: true, code: true, name: true } },
        requestedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { plannedStartDate: "asc" },
    });
  }

  async findById(id: string, user: AuthenticatedUserContext) {
    const ptw = await this.prisma.permitToWork.findUnique({
      where: { id },
      include: {
        plant: true,
        department: true,
        requestedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        isolationPoints: true,
      },
    });
    if (!ptw || ptw.organizationId !== user.organizationId)
      throw new NotFoundException(`Permit [${id}] not found`);
    return ptw;
  }

  async executeAction(
    id: string,
    action: string,
    user: AuthenticatedUserContext,
    dto: PtwActionDto,
  ) {
    const ptw = await this.findById(id, user);
    const nextState = this.TRANSITIONS[ptw.status]?.[action];
    if (!nextState)
      throw new BadRequestException(
        `Action '${action}' invalid from state '${ptw.status}'`,
      );

    return this.prisma.$transaction(async (tx) => {
      const updates: any = { status: nextState as PtwStatus };
      if (action === "APPROVE") {
        updates.approvedById = user.id;
        updates.approvedAt = new Date();
      }
      if (action === "ACTIVATE") updates.actualStartDate = new Date();
      if (action === "CLOSE") {
        updates.closedById = user.id;
        updates.actualEndDate = new Date();
        updates.closedAt = new Date();
      }

      const updated = await tx.permitToWork.update({
        where: { id: ptw.id },
        data: updates,
      });

      await this.workflowService.executeTransition(
        {
          entityType: "PermitToWork",
          entityId: ptw.id,
          action,
          actor: user,
          comments: dto.comments,
          tx,
        },
        this.TRANSITIONS,
      );

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: ptw.plantId,
        actorId: user.id,
        action: `PTW.${action}`,
        entityType: "PermitToWork",
        entityId: ptw.id,
        beforeState: { status: ptw.status },
        afterState: { status: nextState },
        reason: dto.comments,
        tx,
      });

      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: "PTW",
        aggregateId: ptw.id,
        eventType: `PTW_${action}`,
        payload: {
          ptwId: ptw.id,
          fromStatus: ptw.status,
          toStatus: nextState,
          actorId: user.id,
        },
        tx,
      });

      return updated;
    }, TX_CONFIG);
  }
}
