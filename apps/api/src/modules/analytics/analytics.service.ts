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

  async getReports(user: AuthenticatedUserContext) {
    const records = await this.prisma.plantManhours.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (records.length === 0) {
      // Provide default template summary if none logged yet
      return [
        {
          id: "rep-default-1",
          reportType: "Executive EHS Monthly Review",
          plant: "Corporate / All Plants",
          department: "HSE Management",
          dateRange: new Date().toISOString().slice(0, 7),
          generatedBy: `${user.firstName} ${user.lastName}`,
          date: new Date().toLocaleDateString(),
        },
      ];
    }

    return records.map((m) => ({
      id: m.id,
      reportType: "Monthly Safety & Manhours",
      plant: m.plantId || "Primary Plant",
      department: "Operations",
      dateRange: `${m.year}-${String(m.month).padStart(2, "0")}`,
      generatedBy: `${user.firstName} ${user.lastName}`,
      date: m.createdAt
        ? new Date(m.createdAt).toLocaleDateString()
        : new Date().toLocaleDateString(),
    }));
  }

  async logManhours(dto: any, user: AuthenticatedUserContext) {
    const manhoursValue = parseFloat(dto.manhours || dto.employeeManhours || "0");
    const date = dto.date ? new Date(dto.date) : new Date();

    return this.prisma.plantManhours.create({
      data: {
        organizationId: user.organizationId,
        plantId: dto.plant || user.roleScopes[0]?.plantId || undefined,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        employeeManhours: manhoursValue,
        contractorManhours: 0,
      },
    });
  }
}
