import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUserContext } from '../auth/interfaces/auth.interface';
import { AccessScope } from '@kenzo-ehs/types';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(user: AuthenticatedUserContext) {
    const isGlobal = user.roleScopes.some(
      (s) =>
        s.scope === AccessScope.SYSTEM ||
        s.scope === AccessScope.ORGANIZATION ||
        s.scope === AccessScope.ALL_PLANTS,
    );

    const plantFilter = isGlobal
      ? { organizationId: user.organizationId }
      : {
          organizationId: user.organizationId,
          plantId: {
            in: user.roleScopes
              .filter((s) => s.scope === AccessScope.OWN_PLANT && s.plantId)
              .map((s) => s.plantId!),
          },
        };

    const [
      hiraByStatus,
      pendingTasks,
      unreadNotifications,
      recentAuditLogs,
      incidentByStatus,
      openCapas,
      activePermits,
    ] = await Promise.all([
      this.prisma.hiraStudy.groupBy({
        by: ['status'],
        where: { ...plantFilter, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.workflowTask.count({
        where: {
          status: 'PENDING',
          workflowInstance: { organizationId: user.organizationId },
          OR: [
            { assignedToUserId: user.id },
            { assignedRoleCode: { in: user.roles } },
          ],
        },
      }),
      this.prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
      this.prisma.auditLog.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.incident.groupBy({
        by: ['status'],
        where: { ...plantFilter, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.capaRecord.count({
        where: {
          ...plantFilter,
          status: { notIn: ['CLOSED', 'VERIFIED'] },
          deletedAt: null,
        },
      }),
      this.prisma.permitToWork.count({
        where: {
          ...plantFilter,
          status: 'ACTIVE',
          deletedAt: null,
        },
      }),
    ]);

    const hiraStats = {
      total: hiraByStatus.reduce((acc, g) => acc + g._count.id, 0),
      byStatus: Object.fromEntries(hiraByStatus.map((g) => [g.status, g._count.id])),
    };

    const incidentStats = {
      total: incidentByStatus.reduce((acc, g) => acc + g._count.id, 0),
      byStatus: Object.fromEntries(incidentByStatus.map((g) => [g.status, g._count.id])),
    };

    return {
      hira: hiraStats,
      incidents: incidentStats,
      capa: { openCount: openCapas },
      ptw: { activeCount: activePermits },
      workflow: { pendingTasks },
      notifications: { unreadCount: unreadNotifications },
      recentActivity: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actor: log.actor,
        timestamp: log.timestamp,
      })),
    };
  }
}
