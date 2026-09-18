import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";

@Injectable()
export class EmergencyService {
  constructor(private readonly prisma: PrismaService) {}

  async getDrills(user: AuthenticatedUserContext) {
    return this.prisma.emergencyDrill.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { conductedDate: "desc" },
    });
  }

  async logDrill(dto: any, user: AuthenticatedUserContext) {
    let plantId = dto.plantId;
    if (!plantId) {
      const plant = await this.prisma.plant.findFirst({ where: { organizationId: user.organizationId } });
      plantId = plant?.id || "PLANT-DEFAULT";
    }

    return this.prisma.emergencyDrill.create({
      data: {
        organizationId: user.organizationId,
        plantId,
        drillType: dto.drillType || "FIRE_EVACUATION",
        conductedDate: new Date(dto.conductedDate || Date.now()),
        durationMinutes: dto.durationMinutes ? Number(dto.durationMinutes) : 25,
        participantsCount: dto.participantsCount ? Number(dto.participantsCount) : 48,
        evacuationScore: dto.evacuationScore ? Number(dto.evacuationScore) : 95.0,
        strengths: dto.strengths || dto.description || "All personnel reached assembly area safely",
        improvements: dto.improvements || "Continue quarterly drill schedule",
      },
    });
  }

  async getContacts(user: AuthenticatedUserContext) {
    return this.prisma.emergencyContact.findMany({
      where: { plant: { organizationId: user.organizationId } },
      orderBy: { priorityOrder: "asc" },
    });
  }

  async createContact(dto: any, _user: AuthenticatedUserContext) {
    return this.prisma.emergencyContact.create({ data: dto });
  }
}
