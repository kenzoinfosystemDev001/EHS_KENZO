import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  async getCourses(user: AuthenticatedUserContext) {
    return this.prisma.trainingCourse.findMany({
      where: { organizationId: user.organizationId },
      include: { sessions: true },
    });
  }

  async createCourse(dto: any, user: AuthenticatedUserContext) {
    return this.prisma.trainingCourse.create({
      data: {
        organizationId: user.organizationId,
        code: dto.code || `TRN-${Date.now().toString().slice(-6)}`,
        title: dto.title || dto.name || "General EHS Induction Course",
        description: dto.description || "General plant workplace health & safety induction",
        validityMonths: dto.validityMonths ? Number(dto.validityMonths) : 12,
        targetRoles: dto.targetRoles || ["ALL"],
        isActive: true,
      },
    });
  }

  async getSessions(user: AuthenticatedUserContext) {
    return this.prisma.trainingSession.findMany({
      where: { plant: { organizationId: user.organizationId } },
      include: {
        course: true,
        trainer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async createSession(dto: any, _user: AuthenticatedUserContext) {
    return this.prisma.trainingSession.create({
      data: {
        courseId: dto.courseId,
        plantId: dto.plantId,
        trainerId: dto.trainerId,
        sessionDate: new Date(dto.sessionDate || Date.now()),
        durationHours: dto.durationHours || 2.0,
        location: dto.location || null,
      },
    });
  }

  async getRecords(user: AuthenticatedUserContext) {
    return this.prisma.trainingRecord.findMany({
      where: { user: { organizationId: user.organizationId } },
      include: {
        course: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async recordTraining(dto: any, _user: AuthenticatedUserContext) {
    return this.prisma.trainingRecord.create({
      data: {
        sessionId: dto.sessionId || null,
        courseId: dto.courseId,
        userId: dto.userId,
        completionDate: new Date(dto.completionDate || Date.now()),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        score: dto.score || null,
        isCompliant: dto.isCompliant !== undefined ? dto.isCompliant : true,
      },
    });
  }

  async getMatrix(user: AuthenticatedUserContext) {
    const users = await this.prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        trainingRecords: { include: { course: true } },
      },
    });
    return users;
  }

  async checkEligibility(userId: string, _permitCategory?: string) {
    const records = await this.prisma.trainingRecord.findMany({
      where: { userId, isCompliant: true },
    });
    return { eligible: records.length > 0, compliantCoursesCount: records.length };
  }
}
