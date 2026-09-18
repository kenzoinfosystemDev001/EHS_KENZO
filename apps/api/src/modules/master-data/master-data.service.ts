import { Injectable, NotFoundException, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateOrganizationDto,
  CreatePlantDto,
  CreateDepartmentDto,
} from "./dto/master-data.dto";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { seedAll19EnterpriseUsers } from "./enterprise-users.seed";

@Injectable()
export class MasterDataService implements OnModuleInit {
  private readonly logger = new Logger(MasterDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      this.logger.log("Checking and ensuring all 19 enterprise operational roles & users exist...");
      await seedAll19EnterpriseUsers(this.prisma);
      this.logger.log("✅ 19 Enterprise users verified and seeded.");
    } catch (err) {
      this.logger.warn(`Enterprise users auto-seed notice: ${err}`);
    }
  }

  // Organizations
  async getOrganizations() {
    return this.prisma.organization.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async createOrganization(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        code: dto.code,
        name: dto.name,
        slug: dto.slug || dto.code.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        isActive: true,
      },
    });
  }

  // Plants
  async getPlants(user: AuthenticatedUserContext) {
    return this.prisma.plant.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      include: {
        departments: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async createPlant(dto: CreatePlantDto, user: AuthenticatedUserContext) {
    return this.prisma.plant.create({
      data: {
        organizationId: user.organizationId,
        code: dto.code,
        name: dto.name,
        city: dto.city,
        isActive: true,
      },
    });
  }

  // Departments
  async getDepartments(user: AuthenticatedUserContext, plantId?: string) {
    const where: any = { organizationId: user.organizationId, isActive: true };
    if (plantId) where.plantId = plantId;

    return this.prisma.department.findMany({
      where,
      include: {
        plant: { select: { id: true, code: true, name: true } },
        areas: { select: { id: true, code: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async createDepartment(
    dto: CreateDepartmentDto,
    user: AuthenticatedUserContext,
  ) {
    return this.prisma.department.create({
      data: {
        organizationId: user.organizationId,
        plantId: dto.plantId,
        code: dto.code,
        name: dto.name,
        isActive: true,
      },
    });
  }

  // Users
  async getUsers(user: AuthenticatedUserContext) {
    let users = await this.prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        lastLoginAt: true,
        userRoles: {
          include: {
            role: { select: { code: true, name: true } },
            plant: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (users.length < 19) {
      try {
        await seedAll19EnterpriseUsers(this.prisma, user.organizationId);
        users = await this.prisma.user.findMany({
          where: { organizationId: user.organizationId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            lastLoginAt: true,
            userRoles: {
              include: {
                role: { select: { code: true, name: true } },
                plant: { select: { code: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });
      } catch (err) {
        this.logger.warn(`Auto-seeding 19 users in getUsers warning: ${err}`);
      }
    }

    return users;
  }

  async seedAllUsers(organizationId?: string) {
    return seedAll19EnterpriseUsers(this.prisma, organizationId);
  }

  async getUserById(id: string, user: AuthenticatedUserContext) {
    const foundUser = await this.prisma.user.findFirst({
      where: { id, organizationId: user.organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        lastLoginAt: true,
        userRoles: {
          include: {
            role: { select: { code: true, name: true } },
            plant: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!foundUser) {
      throw new NotFoundException(`User [${id}] not found`);
    }

    return foundUser;
  }

  async getAreas(
    user: AuthenticatedUserContext,
    departmentId?: string,
    plantId?: string,
  ) {
    const where: any = { organizationId: user.organizationId, isActive: true };
    if (departmentId) where.departmentId = departmentId;
    if (plantId) where.plantId = plantId;
    return this.prisma.area.findMany({
      where,
      include: {
        department: { select: { id: true, code: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async createArea(dto: {
    organizationId: string;
    plantId: string;
    departmentId: string;
    code: string;
    name: string;
    description?: string;
  }) {
    return this.prisma.area.create({
      data: {
        organizationId: dto.organizationId,
        plantId: dto.plantId,
        departmentId: dto.departmentId,
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        isActive: true,
      },
    });
  }

  async updateUserStatus(
    id: string,
    status: string,
    user: AuthenticatedUserContext,
  ) {
    const target = await this.prisma.user.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!target) throw new NotFoundException(`User [${id}] not found`);
    return this.prisma.user.update({
      where: { id },
      data: { status: status as any },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });
  }
}
