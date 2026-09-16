import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";

@Injectable()
export class OccupationalHealthService {
  constructor(private readonly prisma: PrismaService) {}
  async getRecords(user: AuthenticatedUserContext) {
    return this.prisma.healthRecord.findMany({
      where: { organizationId: user.organizationId },
    });
  }
  async createRecord(dto: any, user: AuthenticatedUserContext) {
    return this.prisma.healthRecord.create({
      data: {
        ...dto,
        organizationId: user.organizationId,
        examDate: new Date(dto.examDate),
      },
    });
  }
  async getUserHistory(userId: string, user: AuthenticatedUserContext) {
    return this.prisma.healthRecord.findMany({
      where: { userId, organizationId: user.organizationId },
    });
  }
}
