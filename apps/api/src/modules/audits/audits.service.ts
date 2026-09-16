import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { AuditPlanStatus } from "@prisma/client";

@Injectable()
export class AuditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlans(user: AuthenticatedUserContext) {
    return this.prisma.auditPlan.findMany({
      where: { organizationId: user.organizationId },
      include: {
        leadAuditor: { select: { id: true, firstName: true, lastName: true, email: true } },
        findings: true,
      },
    });
  }

  async createPlan(dto: any, user: AuthenticatedUserContext) {
    const count = await this.prisma.auditPlan.count({
      where: { organizationId: user.organizationId },
    });
    const seq = String(count + 1).padStart(4, "0");
    const referenceNumber = `AUD-2026-${seq}`;

    return this.prisma.auditPlan.create({
      data: {
        organizationId: user.organizationId,
        plantId: dto.plantId,
        referenceNumber,
        title: dto.title,
        auditType: dto.auditType || "INTERNAL",
        status: AuditPlanStatus.PLANNED,
        leadAuditorId: dto.leadAuditorId || user.id,
        startDate: new Date(dto.startDate || Date.now()),
        endDate: new Date(dto.endDate || Date.now() + 3 * 86400000),
        scopeSummary: dto.scopeSummary || null,
      },
    });
  }

  async getPlanById(id: string, user: AuthenticatedUserContext) {
    const plan = await this.prisma.auditPlan.findUnique({
      where: { id },
      include: {
        leadAuditor: { select: { id: true, firstName: true, lastName: true, email: true } },
        findings: true,
      },
    });
    if (!plan || plan.organizationId !== user.organizationId) {
      throw new NotFoundException("Audit plan not found");
    }
    return plan;
  }

  async addFinding(id: string, dto: any, _user: AuthenticatedUserContext) {
    return this.prisma.auditFinding.create({
      data: {
        auditPlanId: id,
        grade: dto.grade || "MINOR_NC",
        clauseReference: dto.clauseReference || null,
        description: dto.description,
        evidence: dto.evidence || null,
      },
    });
  }

  async completePlan(id: string, user: AuthenticatedUserContext) {
    await this.getPlanById(id, user);
    return this.prisma.auditPlan.update({
      where: { id },
      data: { status: AuditPlanStatus.COMPLETED },
    });
  }

  async closePlan(id: string, user: AuthenticatedUserContext) {
    await this.getPlanById(id, user);
    return this.prisma.auditPlan.update({
      where: { id },
      data: { status: AuditPlanStatus.CLOSED },
    });
  }
}
