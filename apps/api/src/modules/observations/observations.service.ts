import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { OutboxService } from "../outbox/outbox.service";
import { CloudinaryService } from "../media/cloudinary.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import {
  ObservationStatus,
  ActionItemStatus,
  ActionSourceType,
  CapaPriority,
  WorkflowStatus,
  WorkflowTaskStatus,
  NotificationPriority,
  NotificationChannel,
  ObservationType,
  IncidentSeverity,
} from "@prisma/client";
import { EscalateObservationDto } from "./dto/observation.dto";

const TX_CONFIG = { maxWait: 20000, timeout: 60000 };

export const OBSERVATION_WORKFLOW_STAGES = [
  { stage: 1, key: "WORKER_REPORTED", name: "Worker Spots Issue", role: "WORKER", title: "Field Worker / Workman" },
  { stage: 2, key: "PENDING_WORKER_HEAD", name: "Worker Head Verification", role: "SUPERVISOR", title: "Worker Head / Shift Supervisor" },
  { stage: 3, key: "PENDING_DEPT_HEAD", name: "Department Head Review", role: "DEPARTMENT_HEAD", title: "Head of Department" },
  { stage: 4, key: "PENDING_CONTRACTOR", name: "Contractor Assessment", role: "CONTRACTOR_COORDINATOR", title: "Contractor Coordinator" },
  { stage: 5, key: "PENDING_HSE_MANAGER", name: "HSE Manager Verification", role: "HSE_MANAGER", title: "HSE Manager" },
  { stage: 6, key: "PENDING_HEALTH_INSPECTOR", name: "Health Inspector Clearance", role: "OCCUPATIONAL_HEALTH_OFFICER", title: "Health Inspector / OHO" },
  { stage: 7, key: "PENDING_SUB_ADMIN", name: "Sub Admin Pre-Approval", role: "CORPORATE_HSE", title: "Sub Admin / Corporate HSE" },
  { stage: 8, key: "PENDING_ADMIN_APPROVAL", name: "Admin Resource Allocation & Approval", role: "ADMIN", title: "Administrator" },
];

export function determineInitialWorkflow(user: AuthenticatedUserContext, description: string, photoUrl: string | null) {
  const roles = user.roles || [];
  let startStage = 1;

  if (roles.some((r) => ["ADMIN", "SYSTEM_ADMIN"].includes(r))) {
    startStage = 8;
  } else if (roles.some((r) => ["CORPORATE_HSE", "PLANT_HEAD"].includes(r))) {
    startStage = 7;
  } else if (roles.some((r) => ["OCCUPATIONAL_HEALTH_OFFICER", "INDUSTRIAL_HYGIENIST", "EMERGENCY_RESPONSE_COORDINATOR"].includes(r))) {
    startStage = 6;
  } else if (roles.some((r) => ["HSE_MANAGER", "SAFETY_OFFICER"].includes(r))) {
    startStage = 5;
  } else if (roles.some((r) => ["CONTRACTOR_COORDINATOR", "CONTRACTOR_WORKMAN", "CONTRACTOR"].includes(r))) {
    startStage = 4; // Starts from contractor -> next step goes immediately to HSE Manager!
  } else if (roles.some((r) => ["DEPARTMENT_HEAD", "MAINTENANCE_HEAD", "PERMIT_ISSUER", "TRAINER", "LD_MANAGER", "ENVIRONMENT_MANAGER"].includes(r))) {
    startStage = 3;
  } else if (roles.some((r) => ["SUPERVISOR"].includes(r))) {
    startStage = 2;
  } else {
    startStage = 1; // Worker / Plant operator
  }

  const nextStageIndex = Math.min(startStage + 1, 8);
  const nextStageDef = OBSERVATION_WORKFLOW_STAGES[nextStageIndex - 1];

  const stages = OBSERVATION_WORKFLOW_STAGES.map((s) => {
    if (s.stage < nextStageIndex) {
      return {
        ...s,
        status: "COMPLETED",
        actor: `${user.firstName} ${user.lastName}`,
        actorEmail: user.email,
        timestamp: new Date().toISOString(),
        comments: s.stage === startStage ? (description || "Reported hazard") : `Auto-cleared by ${user.roles?.[0] || "Reporter"}`,
        photoUrl: s.stage === startStage ? photoUrl : null,
      };
    } else {
      return {
        ...s,
        status: "PENDING",
      };
    }
  });

  return {
    startStage,
    nextStageIndex,
    currentState: nextStageDef.key,
    assignedRole: nextStageDef.role,
    nextStageDef,
    stages,
  };
}

@Injectable()
export class ObservationsService {
  private readonly logger = new Logger(ObservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private async getOrCreateObservationWorkflowDefinition(tx: any, organizationId: string) {
    let def = await tx.workflowDefinition.findFirst({
      where: { organizationId, code: "WF_OBSERVATION_8STAGE" },
    });
    if (!def) {
      def = await tx.workflowDefinition.create({
        data: {
          organizationId,
          code: "WF_OBSERVATION_8STAGE",
          name: "8-Stage Field Issue Escalation & Resolution Workflow",
          entityType: "SafetyObservation",
          definition: { stages: OBSERVATION_WORKFLOW_STAGES },
          isActive: true,
        },
      });
    }
    return def;
  }

  async create(dto: any, user: AuthenticatedUserContext) {
    // 1. Process and validate photo upload to Cloudinary (strictly .jpg & .png) outside DB transaction
    let photo = dto.photoData || dto.evidenceKey || (dto.imageUrls && dto.imageUrls[0]) || null;
    if (photo && (photo.startsWith("data:image/") || photo.startsWith("/9j/") || photo.startsWith("iVBORw0KGgo"))) {
      try {
        const uploadRes = await this.cloudinary.uploadImage(photo, "kenzo-ehs/observations");
        photo = uploadRes.url;
      } catch (err: any) {
        this.logger.error(`Cloudinary upload failed in create: ${err.message}`, err.stack);
        throw new BadRequestException(err.message || "Failed to upload image to Cloudinary");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let plantId = dto.plantId;
      if (!plantId) {
        const defaultPlant = await tx.plant.findFirst({
          where: { organizationId: user.organizationId },
        });
        if (defaultPlant) {
          plantId = defaultPlant.id;
        } else {
          const newPlant = await tx.plant.create({
            data: {
              organizationId: user.organizationId,
              code: "PLANT-DEFAULT",
              name: "Main Production Facility",
              city: "Vadodara",
              isActive: true,
            },
          });
          plantId = newPlant.id;
        }
      }

      const refCount = await tx.safetyObservation.count({
        where: { organizationId: user.organizationId },
      });
      const seq = String(refCount + 1).padStart(4, "0");
      const referenceNumber = `OBS-2026-${seq}`;

      const obsType = dto.observationType || dto.type || ObservationType.UNSAFE_CONDITION;
      const severity = dto.severity || IncidentSeverity.MEDIUM;
      const location = dto.location || dto.locationDetails || null;

      const obs = await tx.safetyObservation.create({
        data: {
          organizationId: user.organizationId,
          plantId,
          departmentId: dto.departmentId || null,
          areaId: dto.areaId || null,
          referenceNumber,
          observationType: obsType,
          severity,
          description: dto.description,
          locationDetails: location,
          immediateAction: dto.immediateAction || null,
          evidenceKey: photo,
          observerId: user.id,
          actionRequired: false,
          status: ObservationStatus.REPORTED,
        },
      });

      const def = await this.getOrCreateObservationWorkflowDefinition(tx, user.organizationId);
      const initWf = determineInitialWorkflow(user, dto.description, photo);

      const workflowContext = {
        currentStageIndex: initWf.nextStageIndex,
        stages: initWf.stages,
      };

      const wfInstance = await tx.workflowInstance.create({
        data: {
          organizationId: user.organizationId,
          workflowDefinitionId: def.id,
          entityType: "SafetyObservation",
          entityId: obs.id,
          currentState: initWf.currentState,
          status: WorkflowStatus.IN_PROGRESS,
          initiatedById: user.id,
          contextData: workflowContext,
        },
      });

      await tx.workflowAction.create({
        data: {
          workflowInstanceId: wfInstance.id,
          action: "REPORTER_SUBMITTED",
          fromState: "DRAFT",
          toState: initWf.currentState,
          actorId: user.id,
          actorRoleCode: user.roles?.[0] || "WORKER",
          comments: dto.description,
          payload: { photoPresent: !!photo, photoUrl: photo, startStage: initWf.startStage },
        },
      });

      // 1. Create WorkflowTask in the Inbox for the target senior role
      await tx.workflowTask.create({
        data: {
          workflowInstanceId: wfInstance.id,
          stepKey: initWf.nextStageDef.key,
          assignedRoleCode: initWf.nextStageDef.role,
          status: WorkflowTaskStatus.PENDING,
          dueAt: new Date(Date.now() + 24 * 3600000), // 24hr SLA
        },
      });

      // 2. Dispatch immediate in-app notifications to one-step senior users
      const seniorUsers = await tx.userRole.findMany({
        where: {
          organizationId: user.organizationId,
          role: { code: initWf.nextStageDef.role },
        },
        include: { user: true },
      });

      for (const ur of seniorUsers) {
        await tx.notification.create({
          data: {
            userId: ur.userId,
            title: `Safety Hazard Alert: ${referenceNumber}`,
            message: `${user.firstName} ${user.lastName} (${user.roles?.[0] || "Staff"}) reported a hazard (${obsType}). Review required by ${initWf.nextStageDef.title}.`,
            priority: NotificationPriority.HIGH,
            channel: NotificationChannel.IN_APP,
            linkUrl: `/observations?id=${obs.id}`,
            entityType: "SafetyObservation",
            entityId: obs.id,
          },
        });
      }

      await this.audit.log({
        organizationId: user.organizationId,
        plantId: obs.plantId,
        actorId: user.id,
        action: "OBSERVATION.CREATE",
        entityType: "SafetyObservation",
        entityId: obs.id,
        afterState: { status: obs.status, referenceNumber: obs.referenceNumber },
        reason: `Observation reported by ${user.roles?.[0] || "user"}, forwarded to ${initWf.nextStageDef.role}`,
        tx,
      });

      await this.outbox.emit({
        organizationId: user.organizationId,
        aggregateType: "SAFETY_OBSERVATION",
        aggregateId: obs.id,
        eventType: "OBSERVATION_CREATED",
        payload: { id: obs.id, referenceNumber: obs.referenceNumber, evidenceKey: photo },
        tx,
      });

      this.logger.log(`Created observation ${referenceNumber} and routed to ${initWf.nextStageDef.role}`);
      return { ...obs, workflow: wfInstance };
    }, TX_CONFIG);
  }

  async findAll(user: AuthenticatedUserContext) {
    const observations = await this.prisma.safetyObservation.findMany({
      where: { organizationId: user.organizationId },
      include: {
        observer: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        actions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const workflowInstances = await this.prisma.workflowInstance.findMany({
      where: {
        organizationId: user.organizationId,
        entityType: "SafetyObservation",
      },
      include: {
        actions: { orderBy: { timestamp: "asc" } },
      },
    });

    const wfMap = new Map<string, any>();
    for (const wf of workflowInstances) {
      wfMap.set(wf.entityId, wf);
    }

    return observations.map((obs) => {
      let wf = wfMap.get(obs.id);
      if (!wf) {
        wf = {
          currentState: obs.status === ObservationStatus.CLOSED ? "SCHEDULED_FOR_FIXING" : "PENDING_WORKER_HEAD",
          status: obs.status === ObservationStatus.CLOSED ? WorkflowStatus.COMPLETED : WorkflowStatus.IN_PROGRESS,
          contextData: {
            currentStageIndex: obs.status === ObservationStatus.CLOSED ? 9 : 2,
            stages: OBSERVATION_WORKFLOW_STAGES.map((s, idx) => ({
              ...s,
              status: idx === 0 ? "COMPLETED" : obs.status === ObservationStatus.CLOSED ? "COMPLETED" : "PENDING",
            })),
          },
          actions: [],
        };
      }
      return {
        ...obs,
        workflow: wf,
      };
    });
  }

  async findById(id: string, user: AuthenticatedUserContext) {
    const obs = await this.prisma.safetyObservation.findUnique({
      where: { id },
      include: {
        observer: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        actions: true,
      },
    });
    if (!obs || obs.organizationId !== user.organizationId) {
      throw new NotFoundException("Observation not found");
    }

    let wf = await this.prisma.workflowInstance.findFirst({
      where: {
        organizationId: user.organizationId,
        entityType: "SafetyObservation",
        entityId: obs.id,
      },
      include: {
        actions: { orderBy: { timestamp: "asc" } },
      },
    });

    return {
      ...obs,
      workflow: wf,
    };
  }

  async escalate(id: string, dto: EscalateObservationDto, user: AuthenticatedUserContext) {
    return this.prisma.$transaction(async (tx) => {
      const obs = await tx.safetyObservation.findUnique({
        where: { id },
      });
      if (!obs || obs.organizationId !== user.organizationId) {
        throw new NotFoundException("Observation not found");
      }

      let wfInstance = await tx.workflowInstance.findFirst({
        where: {
          organizationId: user.organizationId,
          entityType: "SafetyObservation",
          entityId: obs.id,
        },
      });

      if (!wfInstance) {
        const def = await this.getOrCreateObservationWorkflowDefinition(tx, user.organizationId);
        wfInstance = await tx.workflowInstance.create({
          data: {
            organizationId: user.organizationId,
            workflowDefinitionId: def.id,
            entityType: "SafetyObservation",
            entityId: obs.id,
            currentState: "PENDING_WORKER_HEAD",
            status: WorkflowStatus.IN_PROGRESS,
            initiatedById: obs.observerId,
            contextData: {
              currentStageIndex: 2,
              stages: OBSERVATION_WORKFLOW_STAGES.map((s, idx) => ({
                ...s,
                status: idx === 0 ? "COMPLETED" : "PENDING",
              })),
            },
          },
        });
      }

      const rawContext: any = wfInstance.contextData || {};
      const stages: any[] = rawContext.stages || OBSERVATION_WORKFLOW_STAGES.map((s) => ({ ...s, status: "PENDING" }));

      let nextState = wfInstance.currentState;
      let completedStageIdx = -1;
      let nextStageIdx = rawContext.currentStageIndex || 2;
      let actionName = dto.action;
      let actorRole = user.roles?.[0] || "OPERATOR";

      switch (dto.action) {
        case "PASS_TO_DEPT_HEAD":
          completedStageIdx = 2; // Worker Head verified
          nextStageIdx = 3;
          nextState = "PENDING_DEPT_HEAD";
          actorRole = "SUPERVISOR";
          break;

        case "PASS_TO_CONTRACTOR":
          completedStageIdx = 3; // Dept Head reviewed
          nextStageIdx = 4;
          nextState = "PENDING_CONTRACTOR";
          actorRole = "DEPARTMENT_HEAD";
          break;

        case "PASS_TO_HSE_MANAGER":
          completedStageIdx = 4; // Contractor coordinator assessed
          nextStageIdx = 5;
          nextState = "PENDING_HSE_MANAGER";
          actorRole = "CONTRACTOR_COORDINATOR";
          break;

        case "PASS_TO_HEALTH_INSPECTOR":
          completedStageIdx = 5; // HSE Manager verified
          nextStageIdx = 6;
          nextState = "PENDING_HEALTH_INSPECTOR";
          actorRole = "HSE_MANAGER";
          break;

        case "PASS_TO_SUB_ADMIN":
          completedStageIdx = 6; // Health inspector cleared
          nextStageIdx = 7;
          nextState = "PENDING_SUB_ADMIN";
          actorRole = "OCCUPATIONAL_HEALTH_OFFICER";
          break;

        case "PASS_TO_ADMIN":
          completedStageIdx = 7; // Sub admin pre-approved
          nextStageIdx = 8;
          nextState = "PENDING_ADMIN_APPROVAL";
          actorRole = "CORPORATE_HSE";
          break;

        case "ADMIN_APPROVE_AND_SCHEDULE":
          completedStageIdx = 8; // Admin final approval & assignment
          nextStageIdx = 9;
          nextState = "SCHEDULED_FOR_FIXING";
          actorRole = "ADMIN";
          break;

        default:
          throw new BadRequestException(`Unrecognized escalation action: ${dto.action}`);
      }

      // Update stage records in context
      for (let i = 0; i < stages.length; i++) {
        if (stages[i].stage === completedStageIdx) {
          stages[i].status = "COMPLETED";
          stages[i].completedBy = `${user.firstName} ${user.lastName}`;
          stages[i].completedByEmail = user.email;
          stages[i].role = actorRole;
          stages[i].timestamp = new Date().toISOString();
          stages[i].comments = dto.comments || stages[i].comments || "Approved & forwarded";
          if (dto.action === "ADMIN_APPROVE_AND_SCHEDULE") {
            stages[i].assignedStaff = dto.assignedStaff || "Maintenance Head";
            stages[i].scheduledSlot = dto.scheduledSlot || "Next Available Shift";
            stages[i].allocatedFunds = dto.allocatedFunds || "Allocated";
          }
        }
      }

      const updatedContext: any = {
        ...rawContext,
        currentStageIndex: nextStageIdx,
        stages,
      };

      let actionItemCreated = null;

      if (dto.action === "ADMIN_APPROVE_AND_SCHEDULE") {
        updatedContext.assignedStaff = dto.assignedStaff || "Maintenance Staff";
        updatedContext.scheduledSlot = dto.scheduledSlot || "Immediate Priority";
        updatedContext.allocatedFunds = dto.allocatedFunds || "₹10,000";

        await tx.safetyObservation.update({
          where: { id: obs.id },
          data: {
            status: ObservationStatus.ACTION_REQUIRED,
            actionRequired: true,
            immediateAction: `Assigned: ${dto.assignedStaff || "Maintenance"} | Slot: ${dto.scheduledSlot || "TBD"} | Funds: ${dto.allocatedFunds || "N/A"}. Note: ${dto.comments || ""}`,
            reviewerId: user.id,
            reviewedAt: new Date(),
          },
        });

        const actCount = await tx.actionItem.count({
          where: { organizationId: user.organizationId },
        });
        const seq = String(actCount + 1).padStart(4, "0");
        const referenceNumber = `ACT-2026-${seq}`;

        actionItemCreated = await tx.actionItem.create({
          data: {
            organizationId: user.organizationId,
            plantId: obs.plantId,
            referenceNumber,
            title: `Repair: ${obs.referenceNumber} - ${obs.description.slice(0, 50)}`,
            description: `Fixing Staff: ${dto.assignedStaff || "Maintenance"}\nTime Slot: ${dto.scheduledSlot || "Immediate"}\nBudget/Funds: ${dto.allocatedFunds || "Allocated"}\nDirectives: ${dto.comments || "Follow standard SOPs"}`,
            sourceType: ActionSourceType.OBSERVATION,
            sourceEntityId: obs.id,
            observationId: obs.id,
            status: ActionItemStatus.OPEN,
            priority: CapaPriority.HIGH,
            ownerId: user.id,
            targetDate: new Date(Date.now() + 3 * 24 * 3600000),
          },
        });
      }

      const isCompleted = dto.action === "ADMIN_APPROVE_AND_SCHEDULE";
      const updatedWf = await tx.workflowInstance.update({
        where: { id: wfInstance.id },
        data: {
          currentState: nextState,
          status: isCompleted ? WorkflowStatus.COMPLETED : WorkflowStatus.IN_PROGRESS,
          completedAt: isCompleted ? new Date() : null,
          contextData: updatedContext,
        },
      });

      // 1. Mark existing pending task as completed / approved
      await tx.workflowTask.updateMany({
        where: {
          workflowInstanceId: wfInstance.id,
          status: WorkflowTaskStatus.PENDING,
        },
        data: {
          status: WorkflowTaskStatus.APPROVED,
          completedAt: new Date(),
        },
      });

      // 2. If workflow is advancing to next stage (stage 2 to 8), create new task and dispatch notification to one-step senior
      if (nextStageIdx <= 8) {
        const nextDef = OBSERVATION_WORKFLOW_STAGES[nextStageIdx - 1];
        await tx.workflowTask.create({
          data: {
            workflowInstanceId: wfInstance.id,
            stepKey: nextDef.key,
            assignedRoleCode: nextDef.role,
            status: WorkflowTaskStatus.PENDING,
            dueAt: new Date(Date.now() + 24 * 3600000),
          },
        });

        const nextSeniors = await tx.userRole.findMany({
          where: {
            organizationId: user.organizationId,
            role: { code: nextDef.role },
          },
          include: { user: true },
        });

        for (const ur of nextSeniors) {
          await tx.notification.create({
            data: {
              userId: ur.userId,
              title: `Observation Escalated: ${obs.referenceNumber}`,
              message: `${user.firstName} ${user.lastName} forwarded ${obs.referenceNumber} for your review (${nextDef.title}).`,
              priority: NotificationPriority.HIGH,
              channel: NotificationChannel.IN_APP,
              linkUrl: `/observations?id=${obs.id}`,
              entityType: "SafetyObservation",
              entityId: obs.id,
            },
          });
        }
      }

      await tx.workflowAction.create({
        data: {
          workflowInstanceId: wfInstance.id,
          action: actionName,
          fromState: wfInstance.currentState,
          toState: nextState,
          actorId: user.id,
          actorRoleCode: actorRole,
          comments: dto.comments || null,
          payload: {
            assignedStaff: dto.assignedStaff || null,
            scheduledSlot: dto.scheduledSlot || null,
            allocatedFunds: dto.allocatedFunds || null,
          },
        },
      });

      await this.audit.log({
        organizationId: user.organizationId,
        plantId: obs.plantId,
        actorId: user.id,
        action: `OBSERVATION.WORKFLOW.${actionName}`,
        entityType: "SafetyObservation",
        entityId: obs.id,
        afterState: { currentState: nextState, status: obs.status },
        reason: dto.comments || `Escalated to ${nextState}`,
        tx,
      });

      return {
        success: true,
        observationId: obs.id,
        currentState: nextState,
        workflow: updatedWf,
        actionItem: actionItemCreated,
      };
    }, TX_CONFIG);
  }

  async review(id: string, dto: any, user: AuthenticatedUserContext) {
    return this.prisma.$transaction(async (tx) => {
      const obs = await tx.safetyObservation.update({
        where: { id },
        data: {
          status: ObservationStatus.REVIEWED,
          reviewerId: user.id,
          reviewedAt: new Date(),
        },
      });
      await this.audit.log({
        organizationId: user.organizationId,
        plantId: obs.plantId,
        actorId: user.id,
        action: "OBSERVATION.REVIEW",
        entityType: "SafetyObservation",
        entityId: obs.id,
        afterState: { status: obs.status },
        reason: dto.comments || "Reviewed",
        tx,
      });
      return obs;
    }, TX_CONFIG);
  }

  async requireAction(id: string, user: AuthenticatedUserContext) {
    return this.prisma.$transaction(async (tx) => {
      const obs = await tx.safetyObservation.update({
        where: { id },
        data: {
          status: ObservationStatus.ACTION_REQUIRED,
          actionRequired: true,
        },
      });

      const actCount = await tx.actionItem.count({
        where: { organizationId: user.organizationId },
      });
      const seq = String(actCount + 1).padStart(4, "0");
      const referenceNumber = `ACT-2026-${seq}`;

      const action = await tx.actionItem.create({
        data: {
          organizationId: user.organizationId,
          plantId: obs.plantId,
          referenceNumber,
          title: `Action for observation ${obs.referenceNumber}`,
          description: obs.description,
          sourceType: ActionSourceType.OBSERVATION,
          sourceEntityId: obs.id,
          observationId: obs.id,
          status: ActionItemStatus.OPEN,
          priority: CapaPriority.HIGH,
          ownerId: user.id,
          targetDate: new Date(Date.now() + 7 * 24 * 3600000),
        },
      });

      await this.audit.log({
        organizationId: user.organizationId,
        plantId: obs.plantId,
        actorId: user.id,
        action: "OBSERVATION.REQUIRE_ACTION",
        entityType: "SafetyObservation",
        entityId: obs.id,
        afterState: { status: obs.status, actionId: action.id },
        reason: "Action assigned",
        tx,
      });

      return { obs, action };
    }, TX_CONFIG);
  }

  async verify(id: string, user: AuthenticatedUserContext) {
    return this.prisma.$transaction(async (tx) => {
      const obs = await tx.safetyObservation.update({
        where: { id },
        data: { status: ObservationStatus.VERIFIED },
      });
      await this.audit.log({
        organizationId: user.organizationId,
        plantId: obs.plantId,
        actorId: user.id,
        action: "OBSERVATION.VERIFY",
        entityType: "SafetyObservation",
        entityId: obs.id,
        afterState: { status: obs.status },
        reason: "Observation verified",
        tx,
      });
      return obs;
    }, TX_CONFIG);
  }

  async close(id: string, user: AuthenticatedUserContext) {
    return this.prisma.$transaction(async (tx) => {
      const obs = await tx.safetyObservation.update({
        where: { id },
        data: {
          status: ObservationStatus.CLOSED,
          closedAt: new Date(),
        },
      });
      await this.audit.log({
        organizationId: user.organizationId,
        plantId: obs.plantId,
        actorId: user.id,
        action: "OBSERVATION.CLOSE",
        entityType: "SafetyObservation",
        entityId: obs.id,
        afterState: { status: obs.status },
        reason: "Observation closed",
        tx,
      });
      return obs;
    }, TX_CONFIG);
  }
}
