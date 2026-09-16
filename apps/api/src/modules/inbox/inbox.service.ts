import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUserContext } from '../auth/interfaces/auth.interface';
import { WorkflowTaskStatus, HiraStatus } from '@prisma/client';

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
          { assignedRoleCode: { in: user.roles } },
        ],
        workflowInstance: {
          organizationId: user.organizationId,
        },
      },
      include: {
        workflowInstance: true,
      },
      orderBy: { dueAt: 'asc' },
    });

    // Categorize tasks into real sections
    const myTasks = activeTasks.filter((t) => t.assignedToUserId === user.id);
    const pendingApprovals = activeTasks.filter(
      (t) =>
        t.stepKey.includes('APPROVAL') ||
        t.stepKey === HiraStatus.APPROVAL_PENDING,
    );
    const hiraReviews = activeTasks.filter(
      (t) =>
        t.workflowInstance.entityType === 'HiraStudy' &&
        t.stepKey === HiraStatus.TEAM_REVIEW,
    );
    const capaActions = activeTasks.filter(
      (t) => t.workflowInstance.entityType === 'Capa',
    );
    const overdue = activeTasks.filter(
      (t) => t.dueAt && t.dueAt.getTime() < now.getTime(),
    );

    return {
      counts: {
        totalPending: activeTasks.length,
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
