import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { WorkflowTaskStatus, HiraStatus } from "@prisma/client";

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  async getInboxSummary(user: AuthenticatedUserContext) {
    const now = new Date();

    // Fetch all active tasks assigned to user or their active roles in the organization
    const activeTasks = await this.prisma.workflowTask.findMany({
      where: {
        status: WorkflowTaskStatus.PENDING,
        OR: [
          { assignedToUserId: user.id },
          { assignedRoleCode: { in: user.roles || [] } },
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

    // Fetch entity titles / references for enriched display
    const observationIds = activeTasks
      .filter((t) => t.workflowInstance.entityType === "SafetyObservation")
      .map((t) => t.workflowInstance.entityId);

    const hiraIds = activeTasks
      .filter((t) => t.workflowInstance.entityType === "HiraStudy")
      .map((t) => t.workflowInstance.entityId);

    const [observations, hiraStudies] = await Promise.all([
      observationIds.length > 0
        ? this.prisma.safetyObservation.findMany({
            where: { id: { in: observationIds } },
            select: {
              id: true,
              referenceNumber: true,
              description: true,
              observationType: true,
              severity: true,
              locationDetails: true,
            },
          })
        : [],
      hiraIds.length > 0
        ? this.prisma.hiraStudy.findMany({
            where: { id: { in: hiraIds } },
            select: {
              id: true,
              referenceNumber: true,
              title: true,
              status: true,
            },
          })
        : [],
    ]);

    const obsMap = new Map(observations.map((o) => [o.id, o]));
    const hiraMap = new Map(hiraStudies.map((h) => [h.id, h]));

    const enrichedTasks = activeTasks.map((t) => {
      let entityDetails: any = null;
      if (t.workflowInstance.entityType === "SafetyObservation") {
        entityDetails = obsMap.get(t.workflowInstance.entityId) || null;
      } else if (t.workflowInstance.entityType === "HiraStudy") {
        entityDetails = hiraMap.get(t.workflowInstance.entityId) || null;
      }
      return {
        ...t,
        entityDetails,
      };
    });

    const userRoles = user.roles || [];

    // Categorize tasks into real sections:
    // My tasks: tasks assigned directly to the user OR assigned to user's roles
    const myTasks = enrichedTasks.filter(
      (t) =>
        t.assignedToUserId === user.id ||
        (t.assignedRoleCode && userRoles.includes(t.assignedRoleCode)),
    );

    // Pending approvals: all pending verification, approval, or review stages
    const pendingApprovals = enrichedTasks.filter(
      (t) =>
        t.stepKey.includes("APPROVAL") ||
        t.stepKey.includes("PENDING") ||
        t.stepKey.includes("VERIF") ||
        t.stepKey.includes("REVIEW") ||
        t.stepKey === HiraStatus.APPROVAL_PENDING,
    );

    const hiraReviews = enrichedTasks.filter(
      (t) =>
        t.workflowInstance.entityType === "HiraStudy" &&
        t.stepKey === HiraStatus.TEAM_REVIEW,
    );

    const capaActions = enrichedTasks.filter(
      (t) => t.workflowInstance.entityType === "Capa",
    );

    const overdue = enrichedTasks.filter(
      (t) => t.dueAt && t.dueAt.getTime() < now.getTime(),
    );

    return {
      counts: {
        totalPending: enrichedTasks.length,
        myTasks: myTasks.length,
        pendingApprovals: pendingApprovals.length,
        hiraReviews: hiraReviews.length,
        capaActions: capaActions.length,
        overdue: overdue.length,
      },
      sections: {
        myTasks,
        pendingApprovals,
        hiraReviews,
        capaActions,
        overdue,
      },
    };
  }
}
