import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(user: AuthenticatedUserContext) {
    const orgFilter = { organizationId: user.organizationId };
    const [
      ltiCount,
      manhoursRes,
      recordableIncidents,
      nearMissCount,
      observationCount,
      inspections,
      capas,
    ] = await Promise.all([
      this.prisma.incident.count({
        where: {
          ...orgFilter,
          OR: [
            { incidentType: "LOST_TIME_INJURY" },
            { severity: { in: ["CRITICAL", "CATASTROPHIC"] } },
          ],
        },
      }),
      this.prisma.plantManhours.aggregate({
        where: orgFilter,
        _sum: { employeeManhours: true, contractorManhours: true },
      }),
      this.prisma.incident.count({
        where: { ...orgFilter, incidentType: { in: ["MEDICAL_TREATMENT", "LOST_TIME_INJURY", "FATALITY"] } }, // simplified check
      }),
      this.prisma.incident.count({
        where: { ...orgFilter, incidentType: "NEAR_MISS" },
      }),
      this.prisma.safetyObservation.count({
        where: orgFilter,
      }),
      this.prisma.inspectionExecution.aggregate({
        where: { template: orgFilter },
        _avg: { score: true },
      }),
      this.prisma.capaRecord.findMany({
        where: orgFilter,
        select: { id: true, status: true, dueDate: true, closedAt: true },
      }),
    ]);

    const totalManhours =
      (manhoursRes._sum.employeeManhours || 0) +
      (manhoursRes._sum.contractorManhours || 0);
    const ltifr = totalManhours > 0 ? (ltiCount * 1000000) / totalManhours : 0;
    const trir =
      totalManhours > 0 ? (recordableIncidents * 200000) / totalManhours : 0;

    const onTimeCapas = capas.filter(
      (c) => c.status === "CLOSED" && c.closedAt && c.dueDate && c.closedAt <= c.dueDate,
    ).length;
    const closedCapas = capas.filter((c) => c.status === "CLOSED").length;
    const capaOnTimeClosureRate =
      closedCapas > 0 ? (onTimeCapas / closedCapas) * 100 : 0;

    return {
      ltifr,
      trir,
      nearMissCount,
      observationCount,
      inspectionScoreAvg: inspections._avg.score || 0,
      capaOnTimeClosureRate,
    };
  }

  async getTrends(_user: AuthenticatedUserContext) {
    return []; // Simplified for this exercise
  }

  async logManhours(dto: any, user: AuthenticatedUserContext) {
    return this.prisma.plantManhours.create({
      data: { ...dto, organizationId: user.organizationId },
    });
  }
}
