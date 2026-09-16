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
    return this.prisma.emergencyDrill.create({
      data: {
        ...dto,
        organizationId: user.organizationId,
        conductedDate: new Date(dto.conductedDate || Date.now()),
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
