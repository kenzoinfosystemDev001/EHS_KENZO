import { PrismaClient, UserStatus, RoleScopeLevel } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { Permissions, UserRoleType, AccessScope } from "@kenzo-ehs/types";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Kenzo EHS Database Seeding...");

  // 1. Create Organization (Tenant)
  const org = await prisma.organization.upsert({
    where: { code: "ORG-KENZO" },
    update: {},
    create: {
      code: "ORG-KENZO",
      name: "Kenzo Infosystems Pvt Ltd",
      legalName: "Kenzo Infosystems Private Limited",
      slug: "kenzo-infosystems",
      isActive: true,
      metadata: {
        industry: "Enterprise Technology & Safety Management",
        country: "India",
      },
    },
  });
  console.log(`✅ Organization seeded: ${org.name} (${org.id})`);

  // 2. Create Plants (Sites)
  const plantNW = await prisma.plant.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: "PLANT-NW",
      },
    },
    update: {},
    create: {
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

  const plantSE = await prisma.plant.upsert({
    where: {
      organizationId_code: {
        organizationId: org.id,
        code: "PLANT-SE",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      code: "PLANT-SE",
      name: "South East Manufacturing Facility",
      city: "Chennai",
      state: "Tamil Nadu",
      country: "India",
      timezone: "Asia/Kolkata",
      isActive: true,
    },
  });
  console.log(`✅ Plants seeded: ${plantNW.code}, ${plantSE.code}`);

  // 3. Create Departments for Plant NW
  const deptEHS = await prisma.department.upsert({
    where: {
      plantId_code: {
        plantId: plantNW.id,
        code: "DEPT-EHS",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      code: "DEPT-EHS",
      name: "Environment, Health & Safety",
      isActive: true,
    },
  });

  const deptOps = await prisma.department.upsert({
    where: {
      plantId_code: {
        plantId: plantNW.id,
        code: "DEPT-OPS",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      code: "DEPT-OPS",
      name: "Operations & Production",
      isActive: true,
    },
  });

  const deptMaint = await prisma.department.upsert({
    where: {
      plantId_code: {
        plantId: plantNW.id,
        code: "DEPT-MAINT",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      code: "DEPT-MAINT",
      name: "Maintenance & Engineering",
      isActive: true,
    },
  });
  console.log(
    `✅ Departments seeded for Plant NW: EHS, Operations, Maintenance`,
  );

  // 4. Create Areas in Department Ops
  const areaAlpha = await prisma.area.upsert({
    where: {
      departmentId_code: {
        departmentId: deptOps.id,
        code: "AREA-PROC-A",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      departmentId: deptOps.id,
      code: "AREA-PROC-A",
      name: "Reaction Unit Alpha",
      description: "Continuous chemical synthesis reactor zone",
      isActive: true,
    },
  });
  console.log(`✅ Area seeded: ${areaAlpha.name}`);

  // 5. Seed Permissions
  console.log("⏳ Seeding granular permissions...");
  const allPermissions = Object.entries(Permissions).map(([key, code]) => {
    const [module, action] = code.split(".");
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
  console.log("⏳ Seeding 19 operational roles...");
  const roleDefinitions: {
    code: UserRoleType;
    name: string;
    scopeLevel: RoleScopeLevel;
    isSystem: boolean;
  }[] = [
    {
      code: UserRoleType.SYSTEM_ADMIN,
      name: "System Administrator",
      scopeLevel: RoleScopeLevel.SYSTEM,
      isSystem: true,
    },
    {
      code: UserRoleType.ADMIN,
      name: "Organization Administrator",
      scopeLevel: RoleScopeLevel.ORGANIZATION,
      isSystem: true,
    },
    {
      code: UserRoleType.CORPORATE_HSE,
      name: "Corporate HSE Head",
      scopeLevel: RoleScopeLevel.ORGANIZATION,
      isSystem: false,
    },
    {
      code: UserRoleType.PLANT_HEAD,
      name: "Plant Head",
      scopeLevel: RoleScopeLevel.OWN_PLANT,
      isSystem: false,
    },
    {
      code: UserRoleType.HSE_MANAGER,
      name: "HSE Manager",
      scopeLevel: RoleScopeLevel.OWN_PLANT,
      isSystem: false,
    },
    {
      code: UserRoleType.SAFETY_OFFICER,
      name: "Safety Officer",
      scopeLevel: RoleScopeLevel.OWN_PLANT,
      isSystem: false,
    },
    {
      code: UserRoleType.DEPARTMENT_HEAD,
      name: "Department Head",
      scopeLevel: RoleScopeLevel.OWN_DEPARTMENT,
      isSystem: false,
    },
    {
      code: UserRoleType.MAINTENANCE_HEAD,
      name: "Maintenance Head",
      scopeLevel: RoleScopeLevel.OWN_PLANT,
      isSystem: false,
    },
    {
      code: UserRoleType.SUPERVISOR,
      name: "Shift Supervisor",
      scopeLevel: RoleScopeLevel.OWN_DEPARTMENT,
      isSystem: false,
    },
    {
      code: UserRoleType.PERMIT_ISSUER,
      name: "Permit Issuer",
      scopeLevel: RoleScopeLevel.OWN_PLANT,
      isSystem: false,
    },
    {
      code: UserRoleType.TRAINER,
      name: "Safety Trainer",
      scopeLevel: RoleScopeLevel.OWN_PLANT,
      isSystem: false,
    },
    {
      code: UserRoleType.LD_MANAGER,
      name: "Learning & Development Manager",
      scopeLevel: RoleScopeLevel.ALL_PLANTS,
      isSystem: false,
    },
    {
      code: UserRoleType.ENVIRONMENT_MANAGER,
      name: "Environment Manager",
      scopeLevel: RoleScopeLevel.OWN_PLANT,
      isSystem: false,
    },
    {
      code: UserRoleType.CONTRACTOR_COORDINATOR,
      name: "Contractor Coordinator",
      scopeLevel: RoleScopeLevel.OWN_PLANT,
      isSystem: false,
    },
    {
      code: UserRoleType.OCCUPATIONAL_HEALTH_OFFICER,
      name: "Occupational Health Officer",
      scopeLevel: RoleScopeLevel.OWN_PLANT,
      isSystem: false,
    },
    {
      code: UserRoleType.EMERGENCY_RESPONSE_COORDINATOR,
      name: "Emergency Response Coordinator",
      scopeLevel: RoleScopeLevel.OWN_PLANT,
      isSystem: false,
    },
    {
      code: UserRoleType.INDUSTRIAL_HYGIENIST,
      name: "Industrial Hygienist",
      scopeLevel: RoleScopeLevel.ALL_PLANTS,
      isSystem: false,
    },
    {
      code: UserRoleType.WORKER,
      name: "Plant Operator / Worker",
      scopeLevel: RoleScopeLevel.OWN_RECORDS,
      isSystem: false,
    },
    {
      code: UserRoleType.CONTRACTOR_WORKMAN,
      name: "Contractor Workman",
      scopeLevel: RoleScopeLevel.OWN_RECORDS,
      isSystem: false,
    },
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
  console.log("⏳ Associating permissions to roles...");
  const hseManagerRoleId = roleMap.get(UserRoleType.HSE_MANAGER)!;
  const safetyOfficerRoleId = roleMap.get(UserRoleType.SAFETY_OFFICER)!;
  const plantHeadRoleId = roleMap.get(UserRoleType.PLANT_HEAD)!;
  const adminRoleId = roleMap.get(UserRoleType.ADMIN)!;
  const workerRoleId = roleMap.get(UserRoleType.WORKER)!;

  const permissionsList = await prisma.permission.findMany();
  const permMap = new Map<string, string>(
    permissionsList.map((p) => [p.code, p.id]),
  );

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

  // Admin gets all administrative, operational and view permissions
  await assignPermissions(adminRoleId, Object.values(Permissions));

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
    Permissions.OBSERVATION_CREATE,
    Permissions.OBSERVATION_READ,
    Permissions.OBSERVATION_REVIEW,
    Permissions.ACTION_CREATE,
    Permissions.ACTION_READ,
    Permissions.ACTION_UPDATE,
    Permissions.ACTION_VERIFY,
    Permissions.AUDIT_PERFORM,
    Permissions.AUDIT_READ,
    Permissions.TRAINING_READ,
    Permissions.CONTRACTOR_READ,
    Permissions.ENVIRONMENT_READ,
    Permissions.EMERGENCY_READ,
    Permissions.COMPLIANCE_READ,
    Permissions.REPORTS_READ,
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
    Permissions.OBSERVATION_CREATE,
    Permissions.OBSERVATION_READ,
    Permissions.ACTION_READ,
    Permissions.ACTION_UPDATE,
    Permissions.TRAINING_READ,
  ]);

  // Plant Head permissions
  await assignPermissions(plantHeadRoleId, [
    Permissions.HIRA_READ,
    Permissions.HIRA_APPROVE,
    Permissions.HIRA_ACTIVATE,
    Permissions.INCIDENT_READ,
    Permissions.INCIDENT_APPROVE,
    Permissions.INCIDENT_CLOSE,
    Permissions.RCA_APPROVE,
    Permissions.CAPA_CLOSE,
    Permissions.CAPA_VERIFY,
    Permissions.PTW_APPROVE,
    Permissions.PTW_CLOSE,
    Permissions.AUDIT_LOG_READ,
  ]);
  console.log(
    `✅ Assigned permissions to Admin, HSE Manager, Safety Officer, and Worker`,
  );

  // 8. Seed Default Users with Hashed Passwords
  console.log("⏳ Seeding enterprise test users...");
  const passwordHash = await bcrypt.hash("KenzoEHS@2026!", 12);

  // Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@kenzo-ehs.com" },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      organizationId: org.id,
      email: "admin@kenzo-ehs.com",
      passwordHash,
      firstName: "System",
      lastName: "Administrator",
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
    where: { email: "hse.manager@kenzo-ehs.com" },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      organizationId: org.id,
      email: "hse.manager@kenzo-ehs.com",
      passwordHash,
      firstName: "Vikram",
      lastName: "Sharma",
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
    where: { email: "safety.officer@kenzo-ehs.com" },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      organizationId: org.id,
      email: "safety.officer@kenzo-ehs.com",
      passwordHash,
      firstName: "Rajesh",
      lastName: "Verma",
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
    where: { email: "worker@kenzo-ehs.com" },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      organizationId: org.id,
      email: "worker@kenzo-ehs.com",
      passwordHash,
      firstName: "Amit",
      lastName: "Kumar",
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

  // 9. Seed Business Domain Master Data & Operational Records
  console.log("⏳ Seeding enterprise business domain records...");

  // Plant Manhours for Statistical Rates (LTIFR / TRIR)
  await prisma.plantManhours.upsert({
    where: {
      plantId_year_month: { plantId: plantNW.id, year: 2026, month: 1 },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      year: 2026,
      month: 1,
      employeeManhours: 42500,
      contractorManhours: 18200,
      safeWorkDays: 31,
    },
  });

  await prisma.plantManhours.upsert({
    where: {
      plantId_year_month: { plantId: plantNW.id, year: 2026, month: 2 },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      year: 2026,
      month: 2,
      employeeManhours: 39800,
      contractorManhours: 15400,
      safeWorkDays: 28,
    },
  });

  // Safety Observations
  const obs1 = await prisma.safetyObservation.upsert({
    where: {
      organizationId_referenceNumber: {
        organizationId: org.id,
        referenceNumber: "OBS-2026-NW-0001",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      departmentId: deptOps.id,
      areaId: areaAlpha.id,
      referenceNumber: "OBS-2026-NW-0001",
      observationType: "UNSAFE_CONDITION",
      status: "ACTION_REQUIRED",
      severity: "MEDIUM",
      description: "Chemical drip tray overflow near reactor feed pump P-102.",
      locationDetails: "Reaction Unit Alpha, Bay 3",
      immediateAction: "Placed absorbent pads and barricaded the area.",
      observerId: workerUser.id,
      actionRequired: true,
    },
  });

  const obs2 = await prisma.safetyObservation.upsert({
    where: {
      organizationId_referenceNumber: {
        organizationId: org.id,
        referenceNumber: "OBS-2026-NW-0002",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      departmentId: deptMaint.id,
      referenceNumber: "OBS-2026-NW-0002",
      observationType: "SAFE_ACT",
      status: "CLOSED",
      severity: "LOW",
      description:
        "Maintenance team observed using secondary fall arrest harness correctly at height.",
      observerId: safetyOfficerUser.id,
      reviewerId: hseManagerUser.id,
      actionRequired: false,
      closedAt: new Date(),
    },
  });

  // Unified Action Items
  await prisma.actionItem.upsert({
    where: {
      organizationId_referenceNumber: {
        organizationId: org.id,
        referenceNumber: "ACT-2026-0001",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      referenceNumber: "ACT-2026-0001",
      title: "Replace gasket on chemical feed pump P-102",
      description:
        "Rectify chemical drip tray leak identified during safety walkaround.",
      sourceType: "OBSERVATION",
      sourceEntityId: obs1.id,
      observationId: obs1.id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      ownerId: safetyOfficerUser.id,
      verifierId: hseManagerUser.id,
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // LOTO Equipment
  const lotoEq = await prisma.lotoEquipment.upsert({
    where: {
      plantId_tagNumber: { plantId: plantNW.id, tagNumber: "EQ-RX-201" },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      departmentId: deptOps.id,
      tagNumber: "EQ-RX-201",
      name: "Primary Catalytic Reactor Vessel",
      location: "Reaction Unit Alpha",
      energyTypes: ["ELECTRICAL", "PROCESS_GAS", "THERMAL"],
      isolationSteps:
        "1. Lock breaker MCC-3B. 2. Close nitrogen isolation valve N2-V12. 3. Tag bleed valve.",
      isActive: true,
    },
  });

  // Inspection Templates & Execution
  const inspTpl = await prisma.inspectionTemplate.upsert({
    where: { id: "tpl-fire-safety-nw" },
    update: {},
    create: {
      id: "tpl-fire-safety-nw",
      organizationId: org.id,
      plantId: plantNW.id,
      title: "Monthly Plant Fire & Life Safety Audit Checklist",
      category: "FIRE_SAFETY",
      checklistItems: [
        {
          id: "item-1",
          text: "All fire extinguishers inspected, tagged and unobstructed",
          category: "PASS_FAIL",
          isMandatory: true,
        },
        {
          id: "item-2",
          text: "Emergency exit signage illuminated and pathways clear",
          category: "PASS_FAIL",
          isMandatory: true,
        },
        {
          id: "item-3",
          text: "Fire hydrant pressure gauge reads above 7.0 bar",
          category: "PASS_FAIL",
          isMandatory: true,
        },
        {
          id: "item-4",
          text: "Eye wash stations clean and flow verified",
          category: "PASS_FAIL",
          isMandatory: false,
        },
      ],
      isActive: true,
    },
  });

  await prisma.inspectionExecution.upsert({
    where: { id: "insp-exec-001" },
    update: {},
    create: {
      id: "insp-exec-001",
      organizationId: org.id,
      plantId: plantNW.id,
      departmentId: deptOps.id,
      templateId: inspTpl.id,
      inspectorId: safetyOfficerUser.id,
      status: "COMPLETED",
      score: 95.0,
      findings: [
        { itemId: "item-1", status: "PASS", notes: "Checked 24 extinguishers" },
        { itemId: "item-2", status: "PASS", notes: "Clear" },
        { itemId: "item-3", status: "PASS", notes: "Pressure 7.2 bar" },
        {
          itemId: "item-4",
          status: "MINOR_DEFECT",
          notes: "Eye wash station 4 valve stiff",
        },
      ],
    },
  });

  // Audit Plan & Finding
  const auditPlan = await prisma.auditPlan.upsert({
    where: {
      organizationId_referenceNumber: {
        organizationId: org.id,
        referenceNumber: "AUD-2026-NW-Q1",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      referenceNumber: "AUD-2026-NW-Q1",
      title: "Q1 ISO 45001 Internal Occupational Safety Audit",
      auditType: "ISO45001",
      status: "IN_PROGRESS",
      leadAuditorId: hseManagerUser.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      scopeSummary:
        "Operational compliance across Reaction Unit Alpha, Warehousing, and Maintenance workshops.",
    },
  });

  await prisma.auditFinding.upsert({
    where: { id: "audit-find-001" },
    update: {},
    create: {
      id: "audit-find-001",
      auditPlanId: auditPlan.id,
      grade: "MINOR_NC",
      clauseReference:
        "Clause 8.1.2 - Eliminating hazards and reducing OH&S risks",
      description:
        "LOTO isolation tags missing inspection dates in Substation B.",
      evidence: "Observed during maintenance workshop walkthrough.",
      isResolved: false,
    },
  });

  // Training Courses & Record
  const courseFire = await prisma.trainingCourse.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "TRN-FIRE-01" },
    },
    update: {},
    create: {
      organizationId: org.id,
      code: "TRN-FIRE-01",
      title: "Advanced Fire Fighting & Emergency Response",
      validityMonths: 12,
      targetRoles: ["SAFETY_OFFICER", "SUPERVISOR", "WORKER"],
      isActive: true,
    },
  });

  const courseConfined = await prisma.trainingCourse.upsert({
    where: {
      organizationId_code: { organizationId: org.id, code: "TRN-CSE-02" },
    },
    update: {},
    create: {
      organizationId: org.id,
      code: "TRN-CSE-02",
      title: "Confined Space Entry & Attendant Competency",
      validityMonths: 24,
      targetRoles: ["PERMIT_ISSUER", "WORKER"],
      isActive: true,
    },
  });

  await prisma.trainingRecord.upsert({
    where: { id: "trn-rec-worker-fire" },
    update: {},
    create: {
      id: "trn-rec-worker-fire",
      courseId: courseFire.id,
      userId: workerUser.id,
      completionDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      score: 92.0,
      isCompliant: true,
    },
  });

  // Contractor Company & Worker
  const contractor = await prisma.contractorCompany.upsert({
    where: {
      organizationId_registrationNo: {
        organizationId: org.id,
        registrationNo: "REG-APEX-7789",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      plantId: plantNW.id,
      name: "Apex Industrial Piping & Engineering Services",
      registrationNo: "REG-APEX-7789",
      contactEmail: "safety@apex-services.com",
      contactPhone: "+91-9876543210",
      status: "ACTIVE",
      safetyRating: 98.5,
      prequalifiedUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.contractorWorker.upsert({
    where: {
      contractorId_badgeNumber: {
        contractorId: contractor.id,
        badgeNumber: "CW-2026-004",
      },
    },
    update: {},
    create: {
      contractorId: contractor.id,
      fullName: "Ramesh Verma",
      trade: "Certified High-Pressure Welder",
      badgeNumber: "CW-2026-004",
      inductionValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      medicalValidUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      isPermitEligible: true,
    },
  });

  // Occupational Health Record
  await prisma.healthRecord.upsert({
    where: { id: "health-rec-001" },
    update: {},
    create: {
      id: "health-rec-001",
      organizationId: org.id,
      plantId: plantNW.id,
      userId: workerUser.id,
      examType: "ANNUAL_PERIODIC",
      examDate: new Date(),
      verdict: "FIT_FOR_DUTY",
      nextDueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      doctorNotes:
        "Audiometry and pulmonary function tests within normal baseline parameters.",
    },
  });

  // Environmental Metrics
  await prisma.environmentalMetric.createMany({
    data: [
      {
        organizationId: org.id,
        plantId: plantNW.id,
        metricType: "SCOPE_1_CO2",
        quantity: 142.5,
        unit: "MT",
        logDate: new Date(),
      },
      {
        organizationId: org.id,
        plantId: plantNW.id,
        metricType: "SCOPE_2_ELECTRICITY",
        quantity: 84500.0,
        unit: "kWh",
        logDate: new Date(),
      },
      {
        organizationId: org.id,
        plantId: plantNW.id,
        metricType: "WATER_CONSUMED",
        quantity: 1250.0,
        unit: "kL",
        logDate: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // Emergency Drill & Contacts
  await prisma.emergencyDrill.upsert({
    where: { id: "drill-fire-q1-2026" },
    update: {},
    create: {
      id: "drill-fire-q1-2026",
      organizationId: org.id,
      plantId: plantNW.id,
      drillType: "FIRE_EVACUATION",
      conductedDate: new Date(),
      durationMinutes: 14,
      participantsCount: 88,
      evacuationScore: 96.5,
      strengths:
        "Complete headcount achieved in assembly area in 3 minutes 45 seconds.",
      improvements: "Wind sock visibility in south yard needs replacement.",
    },
  });

  await prisma.emergencyContact.upsert({
    where: { id: "em-contact-fire" },
    update: {},
    create: {
      id: "em-contact-fire",
      plantId: plantNW.id,
      serviceName: "Vadodara Municipal Fire Service",
      contactPerson: "Station Officer",
      phoneNumber: "101 / +91-265-2420101",
      priorityOrder: 1,
    },
  });

  // Compliance Obligations
  await prisma.complianceObligation.upsert({
    where: { id: "comp-factories-act" },
    update: {},
    create: {
      id: "comp-factories-act",
      organizationId: org.id,
      plantId: plantNW.id,
      regulationName: "The Factories Act, 1948",
      authority: "Directorate of Industrial Safety & Health (DISH)",
      obligationTitle:
        "Annual Factory License Renewal & Safety Committee Minutes",
      frequency: "ANNUAL",
      nextDueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      complianceStatus: "COMPLIANT",
      lastAuditDate: new Date(),
    },
  });

  console.log("🎉 Kenzo EHS Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
