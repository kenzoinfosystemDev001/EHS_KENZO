import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { AccessScope } from "@kenzo-ehs/types";

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

    const allowedPlantIds = user.roleScopes
      .map((s) => s.plantId)
      .filter((id): id is string => Boolean(id));

    const plantFilter: any = { organizationId: user.organizationId };
    if (!isGlobal && allowedPlantIds.length > 0) {
      plantFilter.plantId = { in: allowedPlantIds };
    }

    const now = new Date();

    const [
      openIncidents,
      nearMisses,
      observations,
      openCapa,
      overdueCapa,
      pendingHira,
      pendingApprovals,
      trainingRecords,
      inspectionExecutions,
      manhoursAgg,
      ltiCount,
      criticalRisks,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.incident.count({
        where: {
          ...plantFilter,
          deletedAt: null,
          status: { notIn: ["CLOSED"] },
        },
      }),
      this.prisma.incident.count({
        where: { ...plantFilter, deletedAt: null, incidentType: "NEAR_MISS" },
      }),
      this.prisma.safetyObservation.count({
        where: { ...plantFilter },
      }),
      this.prisma.capaRecord.count({
        where: {
          ...plantFilter,
          deletedAt: null,
          status: { notIn: ["CLOSED", "VERIFIED"] },
        },
      }),
      this.prisma.capaRecord.count({
        where: {
          ...plantFilter,
          deletedAt: null,
          status: { notIn: ["CLOSED", "VERIFIED"] },
          dueDate: { lt: now },
        },
      }),
      this.prisma.hiraStudy.count({
        where: {
          ...plantFilter,
          deletedAt: null,
          status: {
            in: ["DRAFT", "IN_PROGRESS", "TEAM_REVIEW", "APPROVAL_PENDING"],
          },
        },
      }),
      this.prisma.workflowTask.count({
        where: {
          status: "PENDING",
          workflowInstance: { organizationId: user.organizationId },
          OR: [
            { assignedToUserId: user.id },
            { assignedRoleCode: { in: user.roles } },
          ],
        },
      }),
      this.prisma.trainingRecord.findMany({
        where: { user: { organizationId: user.organizationId } },
        select: { isCompliant: true },
      }),
      this.prisma.inspectionExecution.aggregate({
        where: { template: { organizationId: user.organizationId } },
        _avg: { score: true },
      }),
      this.prisma.plantManhours.aggregate({
        where: { organizationId: user.organizationId },
        _sum: { employeeManhours: true, contractorManhours: true },
      }),
      this.prisma.incident.count({
        where: {
          ...plantFilter,
          deletedAt: null,
          OR: [
            { incidentType: "LOST_TIME_INJURY" },
            { severity: { in: ["CRITICAL", "CATASTROPHIC"] } },
          ],
        },
      }),
      this.prisma.hiraHazard.count({
        where: {
          residualRiskLevel: "CRITICAL",
          activity: { hiraStudy: { organizationId: user.organizationId } },
        },
      }),
      this.prisma.auditLog.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { timestamp: "desc" },
        take: 10,
        include: {
          actor: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    const trainingCompliance =
      trainingRecords.length > 0
        ? (trainingRecords.filter((r) => r.isCompliant).length /
            trainingRecords.length) *
          100
        : 0;

    const totalManhours =
      (manhoursAgg._sum.employeeManhours || 0) +
      (manhoursAgg._sum.contractorManhours || 0);
    const ltifr = totalManhours > 0 ? (ltiCount * 1000000) / totalManhours : 0;

    return {
      openIncidents,
      nearMisses,
      observations,
      openCapa,
      overdueCapa,
      pendingHira,
      pendingApprovals,
      trainingCompliance,
      inspectionCompliance: inspectionExecutions._avg.score || 0,
      totalManhours,
      ltifr,
      criticalRisks,
      hira: {
        total: pendingHira,
        byStatus: { ACTIVE: pendingHira },
      },
      incidents: {
        total: openIncidents,
        byStatus: { OPEN: openIncidents, NEAR_MISS: nearMisses },
      },
      capa: { openCount: openCapa },
      ptw: { activeCount: 0 },
      workflow: { pendingTasks: pendingApprovals },
      notifications: { unreadCount: 0 },
      recentActivity: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actor: log.actor || { firstName: "System", lastName: "", email: "" },
        timestamp: log.timestamp,
      })),
    };
  }
}
