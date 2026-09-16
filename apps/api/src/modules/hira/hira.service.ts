import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../outbox/outbox.service';
import { WorkflowService } from '../workflow/workflow.service';
import { HiraRiskEngine } from './hira-risk.engine';
import { CreateHiraStudyDto } from './dto/create-hira-study.dto';
import { AddActivityDto } from './dto/add-activity.dto';
import { AddHazardDto } from './dto/add-hazard.dto';
import { HiraActionDto } from './dto/hira-action.dto';
import { AuthenticatedUserContext } from '../auth/interfaces/auth.interface';
import { HiraStatus, HiraApprovalDecision, HiraReviewDecision, RiskLevel } from '@prisma/client';
import { AccessScope, Permissions } from '@kenzo-ehs/types';
import { formatReferenceId } from '@kenzo-ehs/utils';

const TX_CONFIG = { maxWait: 20000, timeout: 60000 };

@Injectable()
export class HiraService {
  // Allowed State Transitions
  private readonly HIRA_TRANSITIONS: Record<string, Record<string, string>> = {
    [HiraStatus.DRAFT]: {
      SUBMIT: HiraStatus.IN_PROGRESS,
      SUBMIT_REVIEW: HiraStatus.TEAM_REVIEW,
    },
    [HiraStatus.IN_PROGRESS]: {
      SUBMIT: HiraStatus.TEAM_REVIEW,
      SUBMIT_REVIEW: HiraStatus.TEAM_REVIEW,
    },
    [HiraStatus.TEAM_REVIEW]: {
      RECOMMEND: HiraStatus.APPROVAL_PENDING,
      REQUEST_REWORK: HiraStatus.IN_PROGRESS,
    },
    [HiraStatus.APPROVAL_PENDING]: {
      APPROVE: HiraStatus.APPROVED,
      REJECT: HiraStatus.IN_PROGRESS,
    },
    [HiraStatus.APPROVED]: {
      ACTIVATE: HiraStatus.ACTIVE,
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
    private readonly workflowService: WorkflowService,
  ) {}

  /**
   * Create a new HIRA Study
   * Enforces plant scope, initializes workflow, generates reference number, logs audit & outbox.
   */
  async createStudy(dto: CreateHiraStudyDto, user: AuthenticatedUserContext) {
    const plant = await this.prisma.plant.findFirst({
      where: { id: dto.plantId, organizationId: user.organizationId },
    });

    if (!plant) {
      throw new BadRequestException(`Plant not found or does not belong to organization`);
    }

    // Verify plant scope
    this.assertPlantAccess(plant.id, user);

    return this.prisma.$transaction(async (tx) => {
      // Generate reference number: HIRA-2026-PLANT-0001
      const count = await tx.hiraStudy.count({
        where: { organizationId: user.organizationId, plantId: plant.id },
      });
      const year = new Date().getFullYear();
      const referenceNumber = formatReferenceId('HIRA', year, plant.code, count + 1);

      const study = await tx.hiraStudy.create({
        data: {
          organizationId: user.organizationId,
          plantId: plant.id,
          departmentId: dto.departmentId,
          areaId: dto.areaId ?? null,
          referenceNumber,
          title: dto.title,
          description: dto.description ?? null,
          status: HiraStatus.DRAFT,
          leaderId: dto.leaderId,
          createdById: user.id,
          teamMembers: {
            create: dto.teamMembers.map((m) => ({
              userId: m.userId,
              roleTitle: m.roleTitle,
            })),
          },
        },
        include: {
          teamMembers: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
            },
          },
          plant: true,
          department: true,
        },
      });

      // Initialize workflow instance
      await this.workflowService.getOrCreateInstance(
        user.organizationId,
        'HiraStudy',
        study.id,
        HiraStatus.DRAFT,
        'HIRA_STUDY_STANDARD_V1',
        tx,
      );

      // Audit Log
      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: plant.id,
        actorId: user.id,
        action: 'HIRA.CREATE',
        entityType: 'HiraStudy',
        entityId: study.id,
        afterState: study as unknown as Record<string, unknown>,
        reason: 'Initial HIRA study creation',
        tx,
      });

      // Outbox Event
      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: 'HIRA',
        aggregateId: study.id,
        eventType: 'HIRA_STUDY_CREATED',
        payload: {
          studyId: study.id,
          referenceNumber: study.referenceNumber,
          plantId: plant.id,
          leaderId: study.leaderId,
        },
        tx,
      });

      return study;
    }, TX_CONFIG);
  }

  /**
   * List HIRA studies filtered by user's organization & plant scope
   */
  async findAll(user: AuthenticatedUserContext, plantId?: string) {
    const whereClause: any = {
      organizationId: user.organizationId,
      deletedAt: null,
    };

    // Filter by allowed plants if scoped
    const isGlobal = user.roleScopes.some(
      (s) => s.scope === AccessScope.SYSTEM || s.scope === AccessScope.ORGANIZATION || s.scope === AccessScope.ALL_PLANTS,
    );

    if (!isGlobal) {
      const allowedPlants = user.roleScopes
        .filter((s) => s.scope === AccessScope.OWN_PLANT && s.plantId)
        .map((s) => s.plantId!);
      whereClause.plantId = { in: allowedPlants };
    }

    if (plantId) {
      this.assertPlantAccess(plantId, user);
      whereClause.plantId = plantId;
    }

    return this.prisma.hiraStudy.findMany({
      where: whereClause,
      include: {
        plant: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
        leader: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: {
          select: { activities: true, teamMembers: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get HIRA Study Details with activities, hazards, and controls
   */
  async findById(id: string, user: AuthenticatedUserContext) {
    const study = await this.prisma.hiraStudy.findUnique({
      where: { id },
      include: {
        plant: true,
        department: true,
        area: true,
        leader: { select: { id: true, email: true, firstName: true, lastName: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        activities: {
          orderBy: { sequenceOrder: 'asc' },
          include: {
            hazards: {
              include: {
                controls: true,
              },
            },
          },
        },
        reviews: {
          orderBy: { reviewedAt: 'desc' },
          include: {
            reviewer: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
        approvals: {
          orderBy: { approvedAt: 'desc' },
          include: {
            approver: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!study || study.organizationId !== user.organizationId) {
      throw new NotFoundException(`HIRA study [${id}] not found`);
    }

    this.assertPlantAccess(study.plantId, user);

    return study;
  }

  /**
   * Add Activity to HIRA Study
   */
  async addActivity(studyId: string, dto: AddActivityDto, user: AuthenticatedUserContext) {
    const study = await this.findById(studyId, user);

    if (study.status === HiraStatus.APPROVED || study.status === HiraStatus.ACTIVE) {
      throw new BadRequestException('Cannot modify activities on an approved or active HIRA study');
    }

    return this.prisma.hiraActivity.create({
      data: {
        hiraStudyId: study.id,
        activityName: dto.activityName,
        description: dto.description ?? null,
        isRoutine: dto.isRoutine ?? true,
        sequenceOrder: dto.sequenceOrder ?? 1,
      },
    });
  }

  /**
   * Add Hazard & Controls with Server-Side Risk Calculation
   */
  async addHazard(
    studyId: string,
    activityId: string,
    dto: AddHazardDto,
    user: AuthenticatedUserContext,
  ) {
    const study = await this.findById(studyId, user);

    if (study.status === HiraStatus.APPROVED || study.status === HiraStatus.ACTIVE) {
      throw new BadRequestException('Cannot add hazards to an approved or active HIRA study');
    }

    const activity = await this.prisma.hiraActivity.findFirst({
      where: { id: activityId, hiraStudyId: study.id },
    });

    if (!activity) {
      throw new NotFoundException(`Activity [${activityId}] not found in study [${studyId}]`);
    }

    // SERVER-SIDE RISK CALCULATION
    const riskEval = HiraRiskEngine.calculateRisk(
      dto.initialSeverity,
      dto.initialLikelihood,
      dto.controls,
      dto.alarpJustification,
    );

    return this.prisma.$transaction(async (tx) => {
      const hazard = await tx.hiraHazard.create({
        data: {
          activityId: activity.id,
          hazardCategory: dto.hazardCategory,
          hazardDescription: dto.hazardDescription,
          consequence: dto.consequence,
          initialSeverity: dto.initialSeverity,
          initialLikelihood: dto.initialLikelihood,
          initialRiskScore: riskEval.initialScore,
          initialRiskLevel: riskEval.initialLevel,
          residualSeverity: riskEval.residualSeverity,
          residualLikelihood: riskEval.residualLikelihood,
          residualRiskScore: riskEval.residualScore,
          residualRiskLevel: riskEval.residualLevel,
          alarpJustified: riskEval.isAlarpJustified,
          alarpJustification: dto.alarpJustification ?? null,
          isUnacceptable: riskEval.isUnacceptable,
          requiresOverride: riskEval.requiresOverride,
          regulatoryReference: dto.regulatoryReference ?? null,
          controls: {
            create: dto.controls.map((c) => ({
              controlType: c.type,
              description: c.description,
              effectivenessPercent: c.effectivenessPercent,
              isExisting: c.isExisting ?? true,
            })),
          },
        },
        include: { controls: true },
      });

      // Advance study state from DRAFT to IN_PROGRESS if first hazard added
      if (study.status === HiraStatus.DRAFT) {
        await tx.hiraStudy.update({
          where: { id: study.id },
          data: { status: HiraStatus.IN_PROGRESS },
        });

        await this.workflowService.executeTransition(
          {
            entityType: 'HiraStudy',
            entityId: study.id,
            action: 'SUBMIT',
            actor: user,
            comments: 'Initial hazard added; moving study to IN_PROGRESS',
            tx,
          },
          this.HIRA_TRANSITIONS,
        );
      }

      return hazard;
    }, TX_CONFIG);
  }

  /**
   * Action: Submit Study for Review
   * Precondition: Must contain at least one activity and hazard
   */
  async submitStudy(id: string, user: AuthenticatedUserContext, dto: HiraActionDto) {
    const study = await this.findById(id, user);

    if (study.status !== HiraStatus.IN_PROGRESS && study.status !== HiraStatus.DRAFT) {
      throw new BadRequestException(`Study in state '${study.status}' cannot be submitted for review`);
    }

    const hazardCount = await this.prisma.hiraHazard.count({
      where: { activity: { hiraStudyId: study.id } },
    });

    if (hazardCount === 0) {
      throw new BadRequestException('HIRA study must contain at least one hazard assessment before submission');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedStudy = await tx.hiraStudy.update({
        where: { id: study.id },
        data: {
          status: HiraStatus.TEAM_REVIEW,
          submittedAt: new Date(),
        },
      });

      const transition = await this.workflowService.executeTransition(
        {
          entityType: 'HiraStudy',
          entityId: study.id,
          action: 'SUBMIT_REVIEW',
          actor: user,
          comments: dto.comments,
          tx,
        },
        this.HIRA_TRANSITIONS,
      );

      // Create workflow task for review
      await this.workflowService.createTask(
        transition.instanceId,
        HiraStatus.TEAM_REVIEW,
        'SAFETY_OFFICER',
        undefined,
        48,
        tx,
      );

      // Audit Log
      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: study.plantId,
        actorId: user.id,
        action: 'HIRA.SUBMIT',
        entityType: 'HiraStudy',
        entityId: study.id,
        beforeState: { status: study.status },
        afterState: { status: updatedStudy.status },
        reason: dto.comments,
        tx,
      });

      // Outbox Event
      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: 'HIRA',
        aggregateId: study.id,
        eventType: 'HIRA_STUDY_SUBMITTED',
        payload: {
          studyId: study.id,
          referenceNumber: study.referenceNumber,
          submittedById: user.id,
        },
        tx,
      });

      return updatedStudy;
    }, TX_CONFIG);
  }

  /**
   * Action: Review Study (Team Review -> Approval Pending, or Rework Required)
   */
  async reviewStudy(
    id: string,
    user: AuthenticatedUserContext,
    dto: HiraActionDto,
    decision: 'RECOMMEND' | 'REQUEST_REWORK',
  ) {
    const study = await this.findById(id, user);

    if (study.status !== HiraStatus.TEAM_REVIEW) {
      throw new BadRequestException(`Study in state '${study.status}' is not in TEAM_REVIEW`);
    }

    const nextStatus =
      decision === 'RECOMMEND' ? HiraStatus.APPROVAL_PENDING : HiraStatus.IN_PROGRESS;

    return this.prisma.$transaction(async (tx) => {
      const updatedStudy = await tx.hiraStudy.update({
        where: { id: study.id },
        data: {
          status: nextStatus,
          reviewedAt: new Date(),
        },
      });

      // Record formal review
      await tx.hiraReview.create({
        data: {
          hiraStudyId: study.id,
          reviewerId: user.id,
          decision:
            decision === 'RECOMMEND'
              ? HiraReviewDecision.RECOMMENDED
              : HiraReviewDecision.REWORK_REQUIRED,
          comments: dto.comments,
        },
      });

      const transition = await this.workflowService.executeTransition(
        {
          entityType: 'HiraStudy',
          entityId: study.id,
          action: decision,
          actor: user,
          comments: dto.comments,
          tx,
        },
        this.HIRA_TRANSITIONS,
      );

      if (decision === 'RECOMMEND') {
        // Create task for Plant Head approval
        await this.workflowService.createTask(
          transition.instanceId,
          HiraStatus.APPROVAL_PENDING,
          'PLANT_HEAD',
          undefined,
          72,
          tx,
        );
      }

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: study.plantId,
        actorId: user.id,
        action: 'HIRA.REVIEW',
        entityType: 'HiraStudy',
        entityId: study.id,
        beforeState: { status: study.status },
        afterState: { status: updatedStudy.status },
        reason: dto.comments,
        tx,
      });

      return updatedStudy;
    }, TX_CONFIG);
  }

  /**
   * Action: Approve Study (Approval Pending -> Approved)
   * Precondition: Unacceptable residual risk requires explicit override and permission HIRA.OVERRIDE_UNACCEPTABLE
   */
  async approveStudy(id: string, user: AuthenticatedUserContext, dto: HiraActionDto) {
    const study = await this.findById(id, user);

    if (study.status !== HiraStatus.APPROVAL_PENDING) {
      throw new BadRequestException(`Study in state '${study.status}' is not pending approval`);
    }

    // Check for unacceptable residual risks
    const criticalHazards = await this.prisma.hiraHazard.findMany({
      where: {
        activity: { hiraStudyId: study.id },
        residualRiskLevel: RiskLevel.CRITICAL,
      },
    });

    const hasCriticalRisk = criticalHazards.length > 0;
    if (hasCriticalRisk) {
      if (!dto.overrideUnacceptableRisk) {
        throw new BadRequestException(
          'HIRA contains critical/unacceptable residual risk. Approval requires explicit override.',
        );
      }
      if (!user.permissions.includes(Permissions.HIRA_OVERRIDE_UNACCEPTABLE)) {
        throw new ForbiddenException(
          'User lacks required permission HIRA.OVERRIDE_UNACCEPTABLE to approve critical residual risk',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedStudy = await tx.hiraStudy.update({
        where: { id: study.id },
        data: {
          status: HiraStatus.APPROVED,
          approvedAt: new Date(),
          unacceptableRiskOverridden: hasCriticalRisk,
          overrideJustification: hasCriticalRisk ? dto.comments : null,
          overrideApprovedById: hasCriticalRisk ? user.id : null,
        },
      });

      // Record formal approval
      await tx.hiraApproval.create({
        data: {
          hiraStudyId: study.id,
          approverId: user.id,
          decision: hasCriticalRisk
            ? HiraApprovalDecision.OVERRIDDEN
            : HiraApprovalDecision.APPROVED,
          comments: dto.comments,
          isOverride: hasCriticalRisk,
        },
      });

      await this.workflowService.executeTransition(
        {
          entityType: 'HiraStudy',
          entityId: study.id,
          action: 'APPROVE',
          actor: user,
          comments: dto.comments,
          tx,
        },
        this.HIRA_TRANSITIONS,
      );

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: study.plantId,
        actorId: user.id,
        action: 'HIRA.APPROVE',
        entityType: 'HiraStudy',
        entityId: study.id,
        beforeState: { status: study.status },
        afterState: { status: updatedStudy.status },
        reason: dto.comments,
        tx,
      });

      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: 'HIRA',
        aggregateId: study.id,
        eventType: 'HIRA_STUDY_APPROVED',
        payload: {
          studyId: study.id,
          referenceNumber: study.referenceNumber,
          approvedById: user.id,
          isOverride: hasCriticalRisk,
        },
        tx,
      });

      return updatedStudy;
    }, TX_CONFIG);
  }

  /**
   * Action: Reject Study (Approval Pending -> In Progress)
   */
  async rejectStudy(id: string, user: AuthenticatedUserContext, dto: HiraActionDto) {
    const study = await this.findById(id, user);

    if (study.status !== HiraStatus.APPROVAL_PENDING) {
      throw new BadRequestException(`Study in state '${study.status}' is not pending approval`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedStudy = await tx.hiraStudy.update({
        where: { id: study.id },
        data: {
          status: HiraStatus.IN_PROGRESS,
        },
      });

      await tx.hiraApproval.create({
        data: {
          hiraStudyId: study.id,
          approverId: user.id,
          decision: HiraApprovalDecision.REJECTED,
          comments: dto.comments,
        },
      });

      await this.workflowService.executeTransition(
        {
          entityType: 'HiraStudy',
          entityId: study.id,
          action: 'REJECT',
          actor: user,
          comments: dto.comments,
          tx,
        },
        this.HIRA_TRANSITIONS,
      );

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: study.plantId,
        actorId: user.id,
        action: 'HIRA.REJECT',
        entityType: 'HiraStudy',
        entityId: study.id,
        beforeState: { status: study.status },
        afterState: { status: updatedStudy.status },
        reason: dto.comments,
        tx,
      });

      return updatedStudy;
    }, TX_CONFIG);
  }

  /**
   * Action: Activate Study (Approved -> Active)
   */
  async activateStudy(id: string, user: AuthenticatedUserContext) {
    const study = await this.findById(id, user);

    if (study.status !== HiraStatus.APPROVED) {
      throw new BadRequestException(`Study in state '${study.status}' must be APPROVED before activation`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Set validity for 1 year from activation
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);

      const updatedStudy = await tx.hiraStudy.update({
        where: { id: study.id },
        data: {
          status: HiraStatus.ACTIVE,
          activatedAt: new Date(),
          validUntil,
        },
      });

      await this.workflowService.executeTransition(
        {
          entityType: 'HiraStudy',
          entityId: study.id,
          action: 'ACTIVATE',
          actor: user,
          comments: 'HIRA activated for site operations',
          tx,
        },
        this.HIRA_TRANSITIONS,
      );

      await this.auditService.log({
        organizationId: user.organizationId,
        plantId: study.plantId,
        actorId: user.id,
        action: 'HIRA.ACTIVATE',
        entityType: 'HiraStudy',
        entityId: study.id,
        beforeState: { status: study.status },
        afterState: { status: updatedStudy.status },
        reason: 'Study activated for plant operations',
        tx,
      });

      await this.outboxService.emit({
        organizationId: user.organizationId,
        aggregateType: 'HIRA',
        aggregateId: study.id,
        eventType: 'HIRA_STUDY_ACTIVATED',
        payload: {
          studyId: study.id,
          referenceNumber: study.referenceNumber,
          activatedById: user.id,
        },
        tx,
      });

      return updatedStudy;
    }, TX_CONFIG);
  }

  /**
   * Geographic scope boundary assertion
   */
  private assertPlantAccess(plantId: string, user: AuthenticatedUserContext) {
    const isGlobal = user.roleScopes.some(
      (s) => s.scope === AccessScope.SYSTEM || s.scope === AccessScope.ORGANIZATION || s.scope === AccessScope.ALL_PLANTS,
    );

    if (isGlobal) return;

    const allowed = user.roleScopes.some(
      (s) => s.scope === AccessScope.OWN_PLANT && s.plantId === plantId,
    );

    if (!allowed) {
      throw new ForbiddenException(`Access denied for Plant [${plantId}] outside user scope`);
    }
  }
}
