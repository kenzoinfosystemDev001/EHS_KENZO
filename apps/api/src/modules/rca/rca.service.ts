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
import {
  CreateRcaDto,
  RcaActionDto,
  AddRcaFindingDto,
} from "./dto/create-rca.dto";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { RcaStatus } from "@prisma/client";
import { AccessScope } from "@kenzo-ehs/types";

const TX_CONFIG = { maxWait: 20000, timeout: 60000 };

@Injectable()
export class RcaService {
  private readonly TRANSITIONS: Record<string, Record<string, string>> = {
    [RcaStatus.DRAFT]: { START: RcaStatus.IN_PROGRESS },
    [RcaStatus.IN_PROGRESS]: { SUBMIT_REVIEW: RcaStatus.REVIEW },
    [RcaStatus.REVIEW]: {
      APPROVE: RcaStatus.APPROVED,
      REWORK: RcaStatus.IN_PROGRESS,
      REJECT: RcaStatus.IN_PROGRESS,
    },
    [RcaStatus.APPROVED]: { CLOSE: RcaStatus.CLOSED },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly workflowService: WorkflowService,
    private readonly sequenceAllocator: SequenceAllocatorService,
  ) {}

  async create(dto: CreateRcaDto, user: AuthenticatedUserContext) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: dto.incidentId, organizationId: user.organizationId },
    });
    if (!incident) throw new NotFoundException("Incident not found");

    return this.prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const referenceNumber = await this.sequenceAllocator.nextReferenceNumber(
        user.organizationId,
        "RCA",
        `RCA-${year}`,
        4,
        tx,
      );

      const rca = await tx.rcaStudy.create({
        data: {
          organizationId: user.organizationId,
          plantId: incident.plantId,
          incidentId: dto.incidentId,
          referenceNumber,
          title: dto.title,
          methodology: dto.methodology,
          status: RcaStatus.DRAFT,
          leadInvestigatorId: dto.leadInvestigatorId ?? user.id,
        },
        include: { incident: { select: { id: true, referenceNumber: true } } },
      });

      await this.workflowService.getOrCreateInstance(
        user.organizationId,
        "RcaStudy",
        rca.id,
        RcaStatus.DRAFT,
        "RCA_STANDARD_V1",
        tx,
      );

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: incident.plantId,
        actorId: user.id,
        action: "RCA.CREATE",
        entityType: "RcaStudy",
        entityId: rca.id,
        afterState: {
          status: rca.status,
          referenceNumber: rca.referenceNumber,
        },
        tx,
      });

      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: "RCA",
        aggregateId: rca.id,
        eventType: "RCA_CREATED",
        payload: {
          rcaId: rca.id,
          incidentId: dto.incidentId,
          referenceNumber: rca.referenceNumber,
        },
        tx,
      });

      return rca;
    }, TX_CONFIG);
  }

  async findAll(user: AuthenticatedUserContext) {
    const isGlobal = user.roleScopes.some(
      (s) =>
        s.scope === AccessScope.SYSTEM ||
        s.scope === AccessScope.ORGANIZATION ||
        s.scope === AccessScope.ALL_PLANTS,
    );
    const where: any = { organizationId: user.organizationId, deletedAt: null };
    const allowedPlantIds = user.roleScopes
      .map((s) => s.plantId)
      .filter((id): id is string => Boolean(id));

    if (!isGlobal && allowedPlantIds.length > 0) {
      where.plantId = { in: allowedPlantIds };
    }
    return this.prisma.rcaStudy.findMany({
      where,
      include: {
        incident: { select: { id: true, referenceNumber: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, user: AuthenticatedUserContext) {
    const rca = await this.prisma.rcaStudy.findUnique({
      where: { id },
      include: {
        incident: { select: { id: true, referenceNumber: true, title: true } },
        findings: true,
        leadInvestigator: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!rca || rca.organizationId !== user.organizationId)
      throw new NotFoundException(`RCA [${id}] not found`);
    return rca;
  }

  async addFinding(
    rcaId: string,
    dto: AddRcaFindingDto,
    user: AuthenticatedUserContext,
  ) {
    const rca = await this.findById(rcaId, user);
    return this.prisma.rcaFinding.create({
      data: {
        rcaStudyId: rca.id,
        whyLevel: dto.whyLevel,
        category: dto.category,
        finding: dto.finding,
        evidence: dto.evidence,
        isRootCause: dto.isRootCause ?? false,
      },
    });
  }

  async executeAction(
    id: string,
    action: string,
    user: AuthenticatedUserContext,
    dto: RcaActionDto,
  ) {
    const rca = await this.findById(id, user);
    const nextState = this.TRANSITIONS[rca.status]?.[action];
    if (!nextState)
      throw new BadRequestException(
        `Action '${action}' invalid from state '${rca.status}'`,
      );

    return this.prisma.$transaction(async (tx) => {
      const updates: any = { status: nextState as RcaStatus };
      if (action === "APPROVE") {
        updates.approvedById = user.id;
        updates.approvedAt = new Date();
      }
      if (action === "CLOSE") updates.closedAt = new Date();

      const updated = await tx.rcaStudy.update({
        where: { id: rca.id },
        data: updates,
      });

      await this.workflowService.executeTransition(
        {
          entityType: "RcaStudy",
          entityId: rca.id,
          action,
          actor: user,
          comments: dto.comments,
          tx,
          record: {
            id: rca.id,
            createdById: rca.leadInvestigatorId,
            leadInvestigatorId: rca.leadInvestigatorId,
          },
        },
        this.TRANSITIONS,
      );

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: rca.plantId,
        actorId: user.id,
        action: `RCA.${action}`,
        entityType: "RcaStudy",
        entityId: rca.id,
        beforeState: { status: rca.status },
        afterState: { status: nextState },
        reason: dto.comments,
        tx,
      });

      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: "RCA",
        aggregateId: rca.id,
        eventType: `RCA_${action}`,
        payload: {
          rcaId: rca.id,
          fromStatus: rca.status,
          toStatus: nextState,
          actorId: user.id,
        },
        tx,
      });

      return updated;
    }, TX_CONFIG);
  }
}
