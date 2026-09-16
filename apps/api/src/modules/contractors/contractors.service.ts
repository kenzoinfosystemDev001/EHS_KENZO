import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";

@Injectable()
export class ContractorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getContractors(user: AuthenticatedUserContext) {
    return this.prisma.contractorCompany.findMany({
      where: { organizationId: user.organizationId },
      include: { workers: true },
    });
  }

  async createContractor(dto: any, user: AuthenticatedUserContext) {
    return this.prisma.contractorCompany.create({
      data: { ...dto, organizationId: user.organizationId },
    });
  }

  async getContractorById(id: string, user: AuthenticatedUserContext) {
    const c = await this.prisma.contractorCompany.findUnique({
      where: { id },
      include: { workers: true },
    });
    if (!c || c.organizationId !== user.organizationId) {
      throw new NotFoundException("Contractor not found");
    }
    return c;
  }

  async getWorkers(contractorId: string, _user: AuthenticatedUserContext) {
    return this.prisma.contractorWorker.findMany({
      where: { contractorId },
    });
  }

  async addWorker(contractorId: string, dto: any, _user: AuthenticatedUserContext) {
    return this.prisma.contractorWorker.create({
      data: { ...dto, contractorId },
    });
  }

  async updateWorkerEligibility(workerId: string, isEligible: boolean, _user: AuthenticatedUserContext) {
    return this.prisma.contractorWorker.update({
      where: { id: workerId },
      data: { isPermitEligible: isEligible },
    });
  }
}
