import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma, WorkflowTaskStatus, WorkflowStatus } from "@prisma/client";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { SeparationOfDutiesPolicy } from "../../common/policies/separation-of-duties.policy";

export interface TransitionParams {
  entityType: string;
  entityId: string;
  action: string;
  actor: AuthenticatedUserContext;
  comments?: string;
  payload?: Record<string, unknown>;
  tx: Prisma.TransactionClient;
  record?: {
    id: string;
    createdById?: string | null;
    authorId?: string | null;
    observerId?: string | null;
    ownerId?: string | null;
    assigneeId?: string | null;
    verifierId?: string | null;
    leadInvestigatorId?: string | null;
    requesterId?: string | null;
    receiverId?: string | null;
    [key: string]: any;
  };
}

export interface TransitionResult {
  fromState: string;
  toState: string;
  instanceId: string;
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sodPolicy: SeparationOfDutiesPolicy,
  ) {}

  /**
   * Initializes or fetches a workflow instance for an entity
   */
  async getOrCreateInstance(
    organizationId: string,
    entityType: string,
    entityId: string,
    initialState: string,
    workflowCode: string,
    tx: Prisma.TransactionClient,
  ) {
    let instance = await tx.workflowInstance.findFirst({
      where: {
        organizationId,
        entityType,
        entityId,
        status: WorkflowStatus.IN_PROGRESS,
      },
    });

    if (!instance) {
      // Find or create definition
      let definition = await tx.workflowDefinition.findFirst({
        where: {
          organizationId,
          code: workflowCode,
          isActive: true,
        },
      });

      if (!definition) {
        definition = await tx.workflowDefinition.create({
          data: {
            organizationId,
            code: workflowCode,
            name: `${entityType} Standard Workflow`,
            entityType,
            definition: {},
          },
        });
      }

      instance = await tx.workflowInstance.create({
        data: {
          organizationId,
          workflowDefinitionId: definition.id,
          entityType,
          entityId,
          currentState: initialState,
          status: WorkflowStatus.IN_PROGRESS,
          initiatedById: organizationId,
        },
      });
    }

    return instance;
  }

  /**
   * Validates and executes an explicit workflow transition atomically
   */
  async executeTransition(
    params: TransitionParams,
    allowedTransitions: Record<string, Record<string, string>>, // [currentState][action] -> nextState
    requiredPermissionsByAction?: Record<string, string>,
  ): Promise<TransitionResult> {
    const { entityType, entityId, action, actor, comments, payload, tx } =
      params;

    // Find active workflow instance
    const instance = await tx.workflowInstance.findFirst({
      where: {
        organizationId: actor.organizationId,
        entityType,
        entityId,
      },
      orderBy: { startedAt: "desc" },
    });

    if (!instance) {
      throw new NotFoundException(
        `No workflow instance found for ${entityType} [${entityId}]`,
      );
    }

    const currentState = instance.currentState;
    const nextState = allowedTransitions[currentState]?.[action];

    if (!nextState) {
      throw new BadRequestException(
        `Invalid workflow action '${action}' from current state '${currentState}'. Permitted actions: ${
          Object.keys(allowedTransitions[currentState] || {}).join(", ") ||
          "None (Terminal State)"
        }`,
      );
    }

    // Check action permission if defined
    if (requiredPermissionsByAction && requiredPermissionsByAction[action]) {
      const requiredPerm = requiredPermissionsByAction[action];
      if (!actor.permissions.includes(requiredPerm)) {
        throw new ForbiddenException(
          `Actor does not have permission '${requiredPerm}' to perform '${action}'`,
        );
      }
    }

    // Enforce Separation of Duties if record context is provided
    if (params.record) {
      this.sodPolicy.assertSeparationOfDuties({
        entityType,
        action,
        actor,
        record: params.record,
      });
    }

    // Update instance state
    await tx.workflowInstance.update({
      where: { id: instance.id },
      data: {
        currentState: nextState,
        contextData: (payload as Prisma.InputJsonValue) ?? undefined,
        completedAt:
          nextState === "ACTIVE" || nextState === "CLOSED" ? new Date() : null,
        status:
          nextState === "ACTIVE" || nextState === "CLOSED"
            ? WorkflowStatus.COMPLETED
            : WorkflowStatus.IN_PROGRESS,
      },
    });

    // Record workflow action
    await tx.workflowAction.create({
      data: {
        workflowInstanceId: instance.id,
        action,
        fromState: currentState,
        toState: nextState,
        actorId: actor.id,
        actorRoleCode: actor.roles[0] || "USER",
        comments: comments ?? null,
        payload: (payload as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    // Mark current pending tasks for this step as complete
    await tx.workflowTask.updateMany({
      where: {
        workflowInstanceId: instance.id,
        stepKey: currentState,
        status: WorkflowTaskStatus.PENDING,
      },
      data: {
        status: WorkflowTaskStatus.APPROVED,
        completedAt: new Date(),
        comments: comments ?? null,
      },
    });

    this.logger.log(
      `Workflow [${instance.id}] ${entityType}(${entityId}): ${currentState} --[${action}]--> ${nextState} by ${actor.email}`,
    );

    return {
      fromState: currentState,
      toState: nextState,
      instanceId: instance.id,
    };
  }

  /**
   * Assigns a new pending workflow task
   */
  async createTask(
    workflowInstanceId: string,
    stepKey: string,
    assignedRoleCode?: string,
    assignedToUserId?: string,
    dueInHours: number = 48,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + dueInHours);

    return client.workflowTask.create({
      data: {
        workflowInstanceId,
        stepKey,
        assignedRoleCode: assignedRoleCode ?? null,
        assignedToUserId: assignedToUserId ?? null,
        status: WorkflowTaskStatus.PENDING,
        dueAt,
      },
    });
  }

  /**
   * Queries pending tasks assigned to user or their active roles
   */
  async getTasksForUser(user: AuthenticatedUserContext) {
    return this.prisma.workflowTask.findMany({
      where: {
        status: WorkflowTaskStatus.PENDING,
        OR: [
          { assignedToUserId: user.id },
          { assignedRoleCode: { in: user.roles } },
        ],
        workflowInstance: {
          organizationId: user.organizationId,
        },
      },
      include: {
        workflowInstance: true,
      },
      orderBy: { dueAt: "asc" },
    });
  }

  /**
   * Queries all active tasks in organization
   */
  async getAllActiveTasks(organizationId: string) {
    return this.prisma.workflowTask.findMany({
      where: {
        status: WorkflowTaskStatus.PENDING,
        workflowInstance: {
          organizationId,
        },
      },
      include: {
        workflowInstance: true,
        assignedToUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
