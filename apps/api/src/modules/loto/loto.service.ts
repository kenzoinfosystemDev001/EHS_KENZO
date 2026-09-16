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
    return this.prisma.lotoIsolation.create({
      data: {
        equipmentId: dto.equipmentId,
        permitId: dto.permitId || null,
        isolationPoint: dto.isolationPoint,
        lockBoxNumber: dto.lockBoxNumber || null,
        appliedById: user.id,
        notes: dto.notes || null,
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
