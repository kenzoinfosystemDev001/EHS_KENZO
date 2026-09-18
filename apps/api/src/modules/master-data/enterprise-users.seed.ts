import { PrismaClient, RoleScopeLevel, UserStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { UserRoleType } from "@kenzo-ehs/types";

export interface SeedUserConfig {
  email: string;
  firstName: string;
  lastName: string;
  roleCode: UserRoleType;
  roleName: string;
  scopeLevel: RoleScopeLevel;
  deptCode?: string;
}

export const ENTERPRISE_USERS: SeedUserConfig[] = [
  {
    email: "sysadmin@kenzo-ehs.com",
    firstName: "Dev",
    lastName: "System Admin",
    roleCode: UserRoleType.SYSTEM_ADMIN,
    roleName: "System Administrator",
    scopeLevel: RoleScopeLevel.SYSTEM,
  },
  {
    email: "admin@kenzo-ehs.com",
    firstName: "Rahul",
    lastName: "Mehta",
    roleCode: UserRoleType.ADMIN,
    roleName: "Organization Administrator",
    scopeLevel: RoleScopeLevel.ORGANIZATION,
    deptCode: "DEPT-EHS",
  },
  {
    email: "subadmin@kenzo-ehs.com",
    firstName: "Priya",
    lastName: "Nair",
    roleCode: UserRoleType.CORPORATE_HSE,
    roleName: "Sub Admin / Corporate HSE Head",
    scopeLevel: RoleScopeLevel.ORGANIZATION,
    deptCode: "DEPT-EHS",
  },
  {
    email: "plant.head@kenzo-ehs.com",
    firstName: "Sanjay",
    lastName: "Kulkarni",
    roleCode: UserRoleType.PLANT_HEAD,
    roleName: "Plant Head",
    scopeLevel: RoleScopeLevel.OWN_PLANT,
    deptCode: "DEPT-OPS",
  },
  {
    email: "hse.manager@kenzo-ehs.com",
    firstName: "Vikram",
    lastName: "Sharma",
    roleCode: UserRoleType.HSE_MANAGER,
    roleName: "HSE Manager",
    scopeLevel: RoleScopeLevel.OWN_PLANT,
    deptCode: "DEPT-EHS",
  },
  {
    email: "safety.officer@kenzo-ehs.com",
    firstName: "Rajesh",
    lastName: "Verma",
    roleCode: UserRoleType.SAFETY_OFFICER,
    roleName: "Safety Officer",
    scopeLevel: RoleScopeLevel.OWN_PLANT,
    deptCode: "DEPT-EHS",
  },
  {
    email: "dept.head@kenzo-ehs.com",
    firstName: "Arvind",
    lastName: "Swamy",
    roleCode: UserRoleType.DEPARTMENT_HEAD,
    roleName: "Department Head",
    scopeLevel: RoleScopeLevel.OWN_DEPARTMENT,
    deptCode: "DEPT-OPS",
  },
  {
    email: "maintenance.head@kenzo-ehs.com",
    firstName: "Manoj",
    lastName: "Patil",
    roleCode: UserRoleType.MAINTENANCE_HEAD,
    roleName: "Maintenance Head",
    scopeLevel: RoleScopeLevel.OWN_PLANT,
    deptCode: "DEPT-MAINT",
  },
  {
    email: "worker.head@kenzo-ehs.com",
    firstName: "Ramesh",
    lastName: "Yadav",
    roleCode: UserRoleType.SUPERVISOR,
    roleName: "Worker Head / Shift Supervisor",
    scopeLevel: RoleScopeLevel.OWN_DEPARTMENT,
    deptCode: "DEPT-OPS",
  },
  {
    email: "permit.issuer@kenzo-ehs.com",
    firstName: "Deepak",
    lastName: "Joshi",
    roleCode: UserRoleType.PERMIT_ISSUER,
    roleName: "Permit Issuer",
    scopeLevel: RoleScopeLevel.OWN_PLANT,
    deptCode: "DEPT-OPS",
  },
  {
    email: "trainer@kenzo-ehs.com",
    firstName: "Sunita",
    lastName: "Rao",
    roleCode: UserRoleType.TRAINER,
    roleName: "Safety Trainer",
    scopeLevel: RoleScopeLevel.OWN_PLANT,
    deptCode: "DEPT-EHS",
  },
  {
    email: "ld.manager@kenzo-ehs.com",
    firstName: "Meera",
    lastName: "Iyer",
    roleCode: UserRoleType.LD_MANAGER,
    roleName: "Learning & Development Manager",
    scopeLevel: RoleScopeLevel.ALL_PLANTS,
    deptCode: "DEPT-EHS",
  },
  {
    email: "environment.mgr@kenzo-ehs.com",
    firstName: "Anil",
    lastName: "Gupta",
    roleCode: UserRoleType.ENVIRONMENT_MANAGER,
    roleName: "Environment Manager",
    scopeLevel: RoleScopeLevel.OWN_PLANT,
    deptCode: "DEPT-EHS",
  },
  {
    email: "contractor.coord@kenzo-ehs.com",
    firstName: "Farhan",
    lastName: "Khan",
    roleCode: UserRoleType.CONTRACTOR_COORDINATOR,
    roleName: "Contractor Coordinator",
    scopeLevel: RoleScopeLevel.OWN_PLANT,
    deptCode: "DEPT-MAINT",
  },
  {
    email: "health.inspector@kenzo-ehs.com",
    firstName: "Dr. Ananya",
    lastName: "Sen",
    roleCode: UserRoleType.OCCUPATIONAL_HEALTH_OFFICER,
    roleName: "Health Inspector / Occupational Health Officer",
    scopeLevel: RoleScopeLevel.OWN_PLANT,
    deptCode: "DEPT-EHS",
  },
  {
    email: "emergency.coord@kenzo-ehs.com",
    firstName: "Capt. K.",
    lastName: "Singh",
    roleCode: UserRoleType.EMERGENCY_RESPONSE_COORDINATOR,
    roleName: "Emergency Response Coordinator",
    scopeLevel: RoleScopeLevel.OWN_PLANT,
    deptCode: "DEPT-EHS",
  },
  {
    email: "hygienist@kenzo-ehs.com",
    firstName: "Neha",
    lastName: "Chawla",
    roleCode: UserRoleType.INDUSTRIAL_HYGIENIST,
    roleName: "Industrial Hygienist",
    scopeLevel: RoleScopeLevel.ALL_PLANTS,
    deptCode: "DEPT-EHS",
  },
  {
    email: "worker@kenzo-ehs.com",
    firstName: "Amit",
    lastName: "Kumar",
    roleCode: UserRoleType.WORKER,
    roleName: "Plant Operator / Worker",
    scopeLevel: RoleScopeLevel.OWN_RECORDS,
    deptCode: "DEPT-OPS",
  },
  {
    email: "contractor.workman@kenzo-ehs.com",
    firstName: "Suresh",
    lastName: "Pal",
    roleCode: UserRoleType.CONTRACTOR_WORKMAN,
    roleName: "Contractor Workman",
    scopeLevel: RoleScopeLevel.OWN_RECORDS,
    deptCode: "DEPT-MAINT",
  },
];

export async function seedAll19EnterpriseUsers(prisma: PrismaClient, orgId?: string) {
  let org = orgId
    ? await prisma.organization.findUnique({ where: { id: orgId } })
    : await prisma.organization.findFirst();

  if (!org) {
    org = await prisma.organization.upsert({
      where: { code: "ORG-KENZO" },
      update: {},
      create: {
        code: "ORG-KENZO",
        name: "Kenzo Infosystems Pvt Ltd",
        legalName: "Kenzo Infosystems Private Limited",
        slug: "kenzo-infosystems",
        isActive: true,
      },
    });
  }

  let plant = await prisma.plant.findFirst({
    where: { organizationId: org.id },
  });

  if (!plant) {
    plant = await prisma.plant.create({
      data: {
        organizationId: org.id,
        code: "PLANT-NW",
        name: "North Wing Chemical Plant",
        city: "Vadodara",
        state: "Gujarat",
        country: "India",
        timezone: "Asia/Kolkata",
        isActive: true,
      },
    });
  }

  const deptMap: Record<string, string> = {};
  const defaultDepts = [
    { code: "DEPT-EHS", name: "Environment, Health & Safety" },
    { code: "DEPT-OPS", name: "Operations & Production" },
    { code: "DEPT-MAINT", name: "Maintenance & Engineering" },
  ];

  for (const d of defaultDepts) {
    const dept = await prisma.department.upsert({
      where: {
        plantId_code: {
          plantId: plant.id,
          code: d.code,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        plantId: plant.id,
        code: d.code,
        name: d.name,
        isActive: true,
      },
    });
    deptMap[d.code] = dept.id;
  }

  const defaultPasswordHash = await bcrypt.hash("KenzoEHS@2026!", 10);

  for (const item of ENTERPRISE_USERS) {
    const roleRecord = await prisma.role.upsert({
      where: {
        organizationId_code: {
          organizationId: org.id,
          code: item.roleCode,
        },
      },
      update: {
        name: item.roleName,
        scopeLevel: item.scopeLevel,
      },
      create: {
        organizationId: org.id,
        code: item.roleCode,
        name: item.roleName,
        scopeLevel: item.scopeLevel,
        isSystem: [UserRoleType.ADMIN, UserRoleType.SYSTEM_ADMIN].includes(item.roleCode),
      },
    });

    const userRecord = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        status: UserStatus.ACTIVE,
        firstName: item.firstName,
        lastName: item.lastName,
      },
      create: {
        organizationId: org.id,
        email: item.email,
        passwordHash: defaultPasswordHash,
        firstName: item.firstName,
        lastName: item.lastName,
        status: UserStatus.ACTIVE,
      },
    });

    const deptId = item.deptCode ? deptMap[item.deptCode] : deptMap["DEPT-EHS"];

    await prisma.userRole.upsert({
      where: {
        userId_roleId_organizationId_plantId_departmentId: {
          userId: userRecord.id,
          roleId: roleRecord.id,
          organizationId: org.id,
          plantId: plant.id,
          departmentId: deptId,
        },
      },
      update: {
        scopeOverride: item.scopeLevel,
      },
      create: {
        userId: userRecord.id,
        roleId: roleRecord.id,
        organizationId: org.id,
        plantId: plant.id,
        departmentId: deptId,
        scopeOverride: item.scopeLevel,
      },
    });
  }

  return { success: true, count: ENTERPRISE_USERS.length };
}
