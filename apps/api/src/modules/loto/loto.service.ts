import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";

@Injectable()
export class LotoService {
  constructor(private readonly prisma: PrismaService) {}

  async getEquipment(user: AuthenticatedUserContext) {
    return this.prisma.lotoEquipment.findMany({
      where: { organizationId: user.organizationId },
    });
  }

  async createEquipment(dto: any, user: AuthenticatedUserContext) {
    return this.prisma.lotoEquipment.create({
      data: { ...dto, organizationId: user.organizationId },
    });
  }

  async getIsolations(user: AuthenticatedUserContext) {
    return this.prisma.lotoIsolation.findMany({
      where: { equipment: { organizationId: user.organizationId } },
      include: {
        equipment: true,
        appliedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        verifiedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        releasedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async applyIsolation(dto: any, user: AuthenticatedUserContext) {
    let equipmentId = dto.equipmentId;
    if (!equipmentId) {
      let eq = await this.prisma.lotoEquipment.findFirst({ where: { organizationId: user.organizationId } });
      if (!eq) {
        let plant = await this.prisma.plant.findFirst({ where: { organizationId: user.organizationId } });
        let dept = await this.prisma.department.findFirst({ where: { organizationId: user.organizationId } });
        eq = await this.prisma.lotoEquipment.create({
          data: {
            organizationId: user.organizationId,
            plantId: plant?.id || "PLANT-DEFAULT",
            departmentId: dept?.id || "DEPT-DEFAULT",
            tagNumber: "EQ-GEN-01",
            name: "Main Feeder Boiler Turbine Unit",
            location: "Primary Generation Bay",
            energyTypes: ["ELECTRICAL", "PNEUMATIC"],
          },
        });
      }
      equipmentId = eq.id;
    }

    return this.prisma.lotoIsolation.create({
      data: {
        equipmentId,
        permitId: dto.permitId || null,
        isolationPoint: dto.isolationPoint || "Main Valve Isolation Point #1",
        lockBoxNumber: dto.lockBoxNumber || "LB-104",
        appliedById: user.id,
        notes: dto.notes || dto.description || "Lockout tag applied for maintenance",
      },
    });
  }

  async verifyIsolation(id: string, user: AuthenticatedUserContext) {
    return this.prisma.lotoIsolation.update({
      where: { id },
      data: { verifiedById: user.id },
    });
  }

  async releaseIsolation(id: string, user: AuthenticatedUserContext) {
    return this.prisma.lotoIsolation.update({
      where: { id },
      data: {
        releasedById: user.id,
        releasedAt: new Date(),
      },
    });
  }
}
