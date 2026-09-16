import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}
  async getObligations(user: AuthenticatedUserContext) {
    return this.prisma.complianceObligation.findMany({
      where: { organizationId: user.organizationId },
    });
  }
  async createObligation(dto: any, user: AuthenticatedUserContext) {
    return this.prisma.complianceObligation.create({
      data: { ...dto, organizationId: user.organizationId },
    });
  }
  async updateStatus(id: string, dto: any, user: AuthenticatedUserContext) {
    return this.prisma.complianceObligation.update({
      where: { id, organizationId: user.organizationId },
      data: { complianceStatus: dto.complianceStatus },
    });
  }
  async getSummary(user: AuthenticatedUserContext) {
    const obs = await this.getObligations(user);
    const summary: Record<string, number> = { COMPLIANT: 0, IN_PROGRESS: 0, NON_COMPLIANT: 0 };
    for (const o of obs) {
      if (summary[o.complianceStatus] !== undefined)
        summary[o.complianceStatus]++;
    }
    return summary;
  }
}
