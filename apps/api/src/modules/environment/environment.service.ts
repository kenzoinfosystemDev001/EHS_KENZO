import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";

@Injectable()
export class EnvironmentService {
  constructor(private readonly prisma: PrismaService) {}
  async getMetrics(user: AuthenticatedUserContext) {
    return this.prisma.environmentalMetric.findMany({
      where: { organizationId: user.organizationId },
    });
  }
  async logMetric(dto: any, user: AuthenticatedUserContext) {
    let plantId = dto.plantId;
    if (!plantId) {
      const plant = await this.prisma.plant.findFirst({ where: { organizationId: user.organizationId } });
      plantId = plant?.id || "PLANT-DEFAULT";
    }

    return this.prisma.environmentalMetric.create({
      data: {
        organizationId: user.organizationId,
        plantId,
        metricType: dto.metricType || "SCOPE_1_CO2",
        quantity: dto.quantity !== undefined ? Number(dto.quantity) : 100,
        unit: dto.unit || "MT",
        logDate: new Date(dto.logDate || Date.now()),
        notes: dto.notes || dto.description || null,
      },
    });
  }
  async getSummary(user: AuthenticatedUserContext) {
    const metrics = await this.prisma.environmentalMetric.findMany({
      where: { organizationId: user.organizationId },
    });
    const summary: Record<string, number> = {
      SCOPE_1_CO2: 0,
      SCOPE_2_ELECTRICITY: 0,
      WATER_CONSUMED: 0,
      HAZARDOUS_WASTE: 0,
    };
    for (const m of metrics) {
      if (summary[m.metricType] !== undefined)
        summary[m.metricType] += m.quantity;
    }
    return summary;
  }
}
