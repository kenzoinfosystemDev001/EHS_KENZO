import { PrismaClient, UserStatus, RoleScopeLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Permissions, UserRoleType, AccessScope } from '@kenzo-ehs/types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Kenzo EHS Database Seeding...');

  // 1. Create Organization (Tenant)
  const org = await prisma.organization.upsert({
    where: { code: 'ORG-KENZO' },
    update: {},
    create: {
      code: 'ORG-KENZO',
      name: 'Kenzo Infosystems Pvt Ltd',
      legalName: 'Kenzo Infosystems Private Limited',
      slug: 'kenzo-infosystems',
      isActive: true,
      metadata: {
        industry: 'Enterprise Technology & Safety Management',
        country: 'India',
      },
    },
  });
  console.log(`✅ Organization seeded: ${org.name} (${org.id})`);

  // 2. Create Plants (Sites)
  const plantNW = await prisma.plant.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'PLANT-NW',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      code: 'PLANT-NW',
      name: 'North Wing Chemical Plant',
      city: 'Vadodara',
      state: 'Gujarat',
      country: 'India',
      timezone: 'Asia/Kolkata',
      isActive: true,
    },
  });

  const plantSE = await prisma.plant.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: 'PLANT-SE',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      code: 'PLANT-SE',
      name: 'South East Manufacturing Facility',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      timezone: 'Asia/Kolkata',
      isActive: true,
    },
  });
  console.log(`✅ Plants seeded: ${plantNW.code}, ${plantSE.code}`);

  // 3. Create Departments for Plant NW
  const deptEHS = await prisma.department.upsert({
    where: {
      plantId_code: {
        plantId: plantNW.id,
        code: 'DEPT-EHS',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      code: 'DEPT-EHS',
      name: 'Environment, Health & Safety',
      isActive: true,
    },
  });

  const deptOps = await prisma.department.upsert({
    where: {
      plantId_code: {
        plantId: plantNW.id,
        code: 'DEPT-OPS',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      code: 'DEPT-OPS',
      name: 'Operations & Production',
      isActive: true,
    },
  });

  const deptMaint = await prisma.department.upsert({
    where: {
      plantId_code: {
        plantId: plantNW.id,
        code: 'DEPT-MAINT',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      code: 'DEPT-MAINT',
      name: 'Maintenance & Engineering',
      isActive: true,
    },
  });
  console.log(`✅ Departments seeded for Plant NW: EHS, Operations, Maintenance`);

  // 4. Create Areas in Department Ops
  const areaAlpha = await prisma.area.upsert({
    where: {
      departmentId_code: {
        departmentId: deptOps.id,
        code: 'AREA-PROC-A',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      departmentId: deptOps.id,
      code: 'AREA-PROC-A',
      name: 'Reaction Unit Alpha',
      description: 'Continuous chemical synthesis reactor zone',
      isActive: true,
    },
  });
  console.log(`✅ Area seeded: ${areaAlpha.name}`);

  // 5. Seed Permissions
  console.log('⏳ Seeding granular permissions...');
  const allPermissions = Object.entries(Permissions).map(([key, code]) => {
    const [module, action] = code.split('.');
    return {
      module,
      action,
      code,
      description: `Allows action ${action} on module ${module}`,
    };
  });

  for (const p of allPermissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description },
      create: p,
    });
  }
  console.log(`✅ Seeded ${allPermissions.length} permissions`);

  // 6. Seed the 19 Operational Roles
  console.log('⏳ Seeding 19 operational roles...');
  const roleDefinitions: { code: UserRoleType; name: string; scopeLevel: RoleScopeLevel; isSystem: boolean }[] = [
    { code: UserRoleType.SYSTEM_ADMIN, name: 'System Administrator', scopeLevel: RoleScopeLevel.SYSTEM, isSystem: true },
    { code: UserRoleType.ADMIN, name: 'Organization Administrator', scopeLevel: RoleScopeLevel.ORGANIZATION, isSystem: true },
    { code: UserRoleType.CORPORATE_HSE, name: 'Corporate HSE Head', scopeLevel: RoleScopeLevel.ORGANIZATION, isSystem: false },
    { code: UserRoleType.PLANT_HEAD, name: 'Plant Head', scopeLevel: RoleScopeLevel.OWN_PLANT, isSystem: false },
    { code: UserRoleType.HSE_MANAGER, name: 'HSE Manager', scopeLevel: RoleScopeLevel.OWN_PLANT, isSystem: false },
    { code: UserRoleType.SAFETY_OFFICER, name: 'Safety Officer', scopeLevel: RoleScopeLevel.OWN_PLANT, isSystem: false },
    { code: UserRoleType.DEPARTMENT_HEAD, name: 'Department Head', scopeLevel: RoleScopeLevel.OWN_DEPARTMENT, isSystem: false },
    { code: UserRoleType.MAINTENANCE_HEAD, name: 'Maintenance Head', scopeLevel: RoleScopeLevel.OWN_PLANT, isSystem: false },
    { code: UserRoleType.SUPERVISOR, name: 'Shift Supervisor', scopeLevel: RoleScopeLevel.OWN_DEPARTMENT, isSystem: false },
    { code: UserRoleType.PERMIT_ISSUER, name: 'Permit Issuer', scopeLevel: RoleScopeLevel.OWN_PLANT, isSystem: false },
    { code: UserRoleType.TRAINER, name: 'Safety Trainer', scopeLevel: RoleScopeLevel.OWN_PLANT, isSystem: false },
    { code: UserRoleType.LD_MANAGER, name: 'Learning & Development Manager', scopeLevel: RoleScopeLevel.ALL_PLANTS, isSystem: false },
    { code: UserRoleType.ENVIRONMENT_MANAGER, name: 'Environment Manager', scopeLevel: RoleScopeLevel.OWN_PLANT, isSystem: false },
    { code: UserRoleType.CONTRACTOR_COORDINATOR, name: 'Contractor Coordinator', scopeLevel: RoleScopeLevel.OWN_PLANT, isSystem: false },
    { code: UserRoleType.OCCUPATIONAL_HEALTH_OFFICER, name: 'Occupational Health Officer', scopeLevel: RoleScopeLevel.OWN_PLANT, isSystem: false },
    { code: UserRoleType.EMERGENCY_RESPONSE_COORDINATOR, name: 'Emergency Response Coordinator', scopeLevel: RoleScopeLevel.OWN_PLANT, isSystem: false },
    { code: UserRoleType.INDUSTRIAL_HYGIENIST, name: 'Industrial Hygienist', scopeLevel: RoleScopeLevel.ALL_PLANTS, isSystem: false },
    { code: UserRoleType.WORKER, name: 'Plant Operator / Worker', scopeLevel: RoleScopeLevel.OWN_RECORDS, isSystem: false },
    { code: UserRoleType.CONTRACTOR_WORKMAN, name: 'Contractor Workman', scopeLevel: RoleScopeLevel.OWN_RECORDS, isSystem: false },
  ];

  const roleMap = new Map<string, string>();
  for (const r of roleDefinitions) {
    const roleRecord = await prisma.role.upsert({
      where: {
        organizationId_code: {
          organizationId: org.id,
          code: r.code,
        },
      },
      update: {
        name: r.name,
        scopeLevel: r.scopeLevel,
      },
      create: {
        organizationId: org.id,
        code: r.code,
        name: r.name,
        scopeLevel: r.scopeLevel,
        isSystem: r.isSystem,
      },
    });
    roleMap.set(r.code, roleRecord.id);
  }
  console.log(`✅ Seeded ${roleDefinitions.length} operational roles`);

  // 7. Associate Permissions to Key Roles
  console.log('⏳ Associating permissions to roles...');
  const hseManagerRoleId = roleMap.get(UserRoleType.HSE_MANAGER)!;
  const safetyOfficerRoleId = roleMap.get(UserRoleType.SAFETY_OFFICER)!;
  const plantHeadRoleId = roleMap.get(UserRoleType.PLANT_HEAD)!;
  const adminRoleId = roleMap.get(UserRoleType.ADMIN)!;
  const workerRoleId = roleMap.get(UserRoleType.WORKER)!;

  const permissionsList = await prisma.permission.findMany();
  const permMap = new Map<string, string>(permissionsList.map((p) => [p.code, p.id]));

  // Helper to link permissions
  async function assignPermissions(roleId: string, codes: string[]) {
    for (const code of codes) {
      const permId = permMap.get(code);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId,
            permissionId: permId,
          },
        });
      }
    }
  }

  // Admin gets all administrative and view permissions
  await assignPermissions(adminRoleId, [
    Permissions.USER_CREATE,
    Permissions.USER_READ,
    Permissions.USER_UPDATE,
    Permissions.USER_DELETE,
    Permissions.ROLE_ASSIGN,
    Permissions.ORGANIZATION_MANAGE,
    Permissions.PLANT_MANAGE,
    Permissions.DEPARTMENT_MANAGE,
    Permissions.AUDIT_LOG_READ,
    Permissions.HIRA_READ,
    Permissions.INCIDENT_READ,
    Permissions.CAPA_READ,
  ]);

  // HSE Manager gets comprehensive HIRA, Incident, RCA, CAPA permissions
  await assignPermissions(hseManagerRoleId, [
    Permissions.HIRA_CREATE,
    Permissions.HIRA_READ,
    Permissions.HIRA_UPDATE,
    Permissions.HIRA_SUBMIT,
    Permissions.HIRA_REVIEW,
    Permissions.HIRA_APPROVE,
    Permissions.HIRA_OVERRIDE_UNACCEPTABLE,
    Permissions.HIRA_ACTIVATE,
    Permissions.INCIDENT_CREATE,
    Permissions.INCIDENT_READ,
    Permissions.INCIDENT_UPDATE,
    Permissions.INCIDENT_CLASSIFY,
    Permissions.INCIDENT_INVESTIGATE,
    Permissions.INCIDENT_SUBMIT,
    Permissions.INCIDENT_APPROVE,
    Permissions.INCIDENT_CLOSE,
    Permissions.INCIDENT_STATUTORY_FILE,
    Permissions.RCA_CREATE,
    Permissions.RCA_UPDATE,
    Permissions.RCA_APPROVE,
    Permissions.CAPA_CREATE,
    Permissions.CAPA_ASSIGN,
    Permissions.CAPA_UPDATE,
    Permissions.CAPA_VERIFY,
    Permissions.CAPA_CLOSE,
    Permissions.CAPA_REVIEW_EFFECTIVENESS,
    Permissions.AUDIT_LOG_READ,
  ]);

  // Safety Officer gets field safety, investigation, independent CAPA verification
  await assignPermissions(safetyOfficerRoleId, [
    Permissions.HIRA_CREATE,
    Permissions.HIRA_READ,
    Permissions.HIRA_UPDATE,
    Permissions.HIRA_SUBMIT,
    Permissions.HIRA_REVIEW,
    Permissions.INCIDENT_CREATE,
    Permissions.INCIDENT_READ,
    Permissions.INCIDENT_UPDATE,
    Permissions.INCIDENT_CLASSIFY,
    Permissions.INCIDENT_INVESTIGATE,
    Permissions.RCA_CREATE,
    Permissions.RCA_UPDATE,
    Permissions.CAPA_CREATE,
    Permissions.CAPA_ASSIGN,
    Permissions.CAPA_UPDATE,
    Permissions.CAPA_VERIFY,
    Permissions.INSPECTION_CREATE,
    Permissions.INSPECTION_EXECUTE,
    Permissions.INSPECTION_SUBMIT,
    Permissions.PTW_READ,
    Permissions.LOTO_APPLY,
  ]);

  // Worker gets reporting and personal record access
  await assignPermissions(workerRoleId, [
    Permissions.HIRA_READ,
    Permissions.INCIDENT_CREATE,
    Permissions.INCIDENT_READ,
    Permissions.CAPA_READ,
    Permissions.CAPA_EXECUTE,
    Permissions.PTW_CREATE,
    Permissions.PTW_READ,
  ]);
  console.log(`✅ Assigned permissions to Admin, HSE Manager, Safety Officer, and Worker`);

  // 8. Seed Default Users with Hashed Passwords
  console.log('⏳ Seeding enterprise test users...');
  const passwordHash = await bcrypt.hash('KenzoEHS@2026!', 12);

  // Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kenzo-ehs.com' },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      organizationId: org.id,
      email: 'admin@kenzo-ehs.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId_organizationId_plantId_departmentId: {
        userId: adminUser.id,
        roleId: adminRoleId,
        organizationId: org.id,
        plantId: plantNW.id,
        departmentId: deptEHS.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRoleId,
      organizationId: org.id,
      plantId: plantNW.id,
      departmentId: deptEHS.id,
      scopeOverride: RoleScopeLevel.ORGANIZATION,
    },
  });

  // HSE Manager User (Plant NW)
  const hseManagerUser = await prisma.user.upsert({
    where: { email: 'hse.manager@kenzo-ehs.com' },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      organizationId: org.id,
      email: 'hse.manager@kenzo-ehs.com',
      passwordHash,
      firstName: 'Vikram',
      lastName: 'Sharma',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId_organizationId_plantId_departmentId: {
        userId: hseManagerUser.id,
        roleId: hseManagerRoleId,
        organizationId: org.id,
        plantId: plantNW.id,
        departmentId: deptEHS.id,
      },
    },
    update: {},
    create: {
      userId: hseManagerUser.id,
      roleId: hseManagerRoleId,
      organizationId: org.id,
      plantId: plantNW.id,
      departmentId: deptEHS.id,
      scopeOverride: RoleScopeLevel.OWN_PLANT,
    },
  });

  // Safety Officer User (Plant NW)
  const safetyOfficerUser = await prisma.user.upsert({
    where: { email: 'safety.officer@kenzo-ehs.com' },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      organizationId: org.id,
      email: 'safety.officer@kenzo-ehs.com',
      passwordHash,
      firstName: 'Rajesh',
      lastName: 'Verma',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId_organizationId_plantId_departmentId: {
        userId: safetyOfficerUser.id,
        roleId: safetyOfficerRoleId,
        organizationId: org.id,
        plantId: plantNW.id,
        departmentId: deptEHS.id,
      },
    },
    update: {},
    create: {
      userId: safetyOfficerUser.id,
      roleId: safetyOfficerRoleId,
      organizationId: org.id,
      plantId: plantNW.id,
      departmentId: deptEHS.id,
      scopeOverride: RoleScopeLevel.OWN_PLANT,
    },
  });

  // Worker User (Plant NW)
  const workerUser = await prisma.user.upsert({
    where: { email: 'worker@kenzo-ehs.com' },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      organizationId: org.id,
      email: 'worker@kenzo-ehs.com',
      passwordHash,
      firstName: 'Amit',
      lastName: 'Kumar',
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId_organizationId_plantId_departmentId: {
        userId: workerUser.id,
        roleId: workerRoleId,
        organizationId: org.id,
        plantId: plantNW.id,
        departmentId: deptOps.id,
      },
    },
    update: {},
    create: {
      userId: workerUser.id,
      roleId: workerRoleId,
      organizationId: org.id,
      plantId: plantNW.id,
      departmentId: deptOps.id,
      scopeOverride: RoleScopeLevel.OWN_RECORDS,
    },
  });

  console.log(`✅ Seeded 4 default enterprise users:`);
  console.log(`   - admin@kenzo-ehs.com (ADMIN)`);
  console.log(`   - hse.manager@kenzo-ehs.com (HSE_MANAGER - Plant NW)`);
  console.log(`   - safety.officer@kenzo-ehs.com (SAFETY_OFFICER - Plant NW)`);
  console.log(`   - worker@kenzo-ehs.com (WORKER - Plant NW)`);
  console.log(`   Default Password for all: KenzoEHS@2026!`);

  console.log('🎉 Kenzo EHS Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
