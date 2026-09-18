import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { InspectionStatus } from "@prisma/client";

@Injectable()
export class InspectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplates(user: AuthenticatedUserContext) {
    return this.prisma.inspectionTemplate.findMany({
      where: { organizationId: user.organizationId },
    });
  }

  async createTemplate(dto: any, user: AuthenticatedUserContext) {
    return this.prisma.inspectionTemplate.create({
      data: {
        organizationId: user.organizationId,
        plantId: dto.plantId || null,
        title: dto.title,
        category: dto.category || "GENERAL",
        checklistItems: dto.checklistItems || [],
      },
    });
  }

  async getExecutions(user: AuthenticatedUserContext) {
    return this.prisma.inspectionExecution.findMany({
      where: { organizationId: user.organizationId },
      include: {
        template: { select: { title: true, category: true } },
        inspector: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { executedAt: "desc" },
    });
  }

  async executeInspection(dto: any, user: AuthenticatedUserContext) {
    let plantId = dto.plantId;
    if (!plantId) {
      const p = await this.prisma.plant.findFirst({ where: { organizationId: user.organizationId } });
      plantId = p?.id;
    }

    let templateId = dto.templateId;
    if (!templateId) {
      let t = await this.prisma.inspectionTemplate.findFirst({ where: { organizationId: user.organizationId } });
      if (!t) {
        t = await this.prisma.inspectionTemplate.create({
          data: {
            organizationId: user.organizationId,
            title: "Workplace Routine Safety Inspection",
            category: "SAFETY",
            checklistItems: [
              { id: "1", text: "Emergency exits free of obstruction" },
              { id: "2", text: "Fire extinguishers inspected & tagged" },
              { id: "3", text: "Personnel wearing mandatory PPE" },
            ],
          },
        });
      }
      templateId = t.id;
    }

    const findings = dto.findings || [];
    const totalItems = findings.length;
    const passedItems = findings.filter((f: any) => f.status === "PASS").length;
    const score = totalItems > 0 ? (passedItems / totalItems) * 100 : 100;

    return this.prisma.inspectionExecution.create({
      data: {
        organizationId: user.organizationId,
        plantId,
        departmentId: dto.departmentId || null,
        templateId,
        inspectorId: user.id,
        status: InspectionStatus.COMPLETED,
        score,
        findings,
        executedAt: new Date(),
      },
    });
  }

  async getExecutionById(id: string, user: AuthenticatedUserContext) {
    const execution = await this.prisma.inspectionExecution.findUnique({
      where: { id },
      include: {
        template: true,
        inspector: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!execution || execution.organizationId !== user.organizationId) {
      throw new NotFoundException("Inspection execution not found");
    }
    return execution;
  }
}
