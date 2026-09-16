import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { TransformInterceptor } from "../src/common/interceptors/transform.interceptor";
import { HazardCategory, ControlHierarchyType } from "@prisma/client";

describe("Kenzo EHS — HIRA & Workflow Vertical Slice E2E Test Suite", () => {
  jest.setTimeout(45000);

  let app: INestApplication;
  let hseToken: string;
  let hseUserId: string;
  let plantId: string;
  let departmentId: string;
  let hiraStudyId: string;
  let activityId: string;
  let hazardId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api/v1");
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("1. Health and Readiness Probes", () => {
    it("GET /api/v1/health should confirm liveness", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/health")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ok");
    });

    it("GET /api/v1/health/ready should confirm live database connectivity", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/health/ready")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ready");
      expect(res.body.data.checks.database).toBe("healthy");
    });
  });

  describe("2. Authentication & Organizational Context", () => {
    it("POST /api/v1/auth/login should authenticate HSE Manager", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({
          email: "hse.manager@kenzo-ehs.com",
          password: "KenzoEHS@2026!",
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      hseToken = res.body.data.accessToken;
      hseUserId = res.body.data.user.id;
    });

    it("GET /api/v1/plants should retrieve plants within organization scope", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/plants")
        .set("Authorization", `Bearer ${hseToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      plantId = res.body.data[0].id;
      expect(plantId).toBeDefined();
    });

    it("GET /api/v1/departments should retrieve departments within organization scope", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/departments")
        .set("Authorization", `Bearer ${hseToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      departmentId = res.body.data[0].id;
      expect(departmentId).toBeDefined();
    });
  });

  describe("3. HIRA Study Lifecycle: Creation & Scoping", () => {
    it("POST /api/v1/hira should create a new HIRA study in DRAFT status", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/hira")
        .set("Authorization", `Bearer ${hseToken}`)
        .send({
          title: "Catalytic Reactor Maintenance & Confined Space Entry",
          description:
            "HIRA study for overhaul, purge, and internal catalyst inspection in reactor R-201",
          plantId,
          departmentId,
          leaderId: hseUserId,
          teamMembers: [
            {
              userId: hseUserId,
              roleTitle: "HSE Risk Lead & Facilitator",
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe("DRAFT");
      expect(res.body.data.referenceNumber).toMatch(/^HIRA-\d{4}-/);
      hiraStudyId = res.body.data.id;
    });

    it("POST /api/v1/hira/:id/activities should add an operational activity", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/hira/${hiraStudyId}/activities`)
        .set("Authorization", `Bearer ${hseToken}`)
        .send({
          activityName: "Catalyst Bed Vacuuming and Nitrogen Purging",
          description:
            "Evacuation of spent catalyst under inert nitrogen atmosphere",
          isRoutine: false,
          sequenceOrder: 1,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.activityName).toBe(
        "Catalyst Bed Vacuuming and Nitrogen Purging",
      );
      activityId = res.body.data.id;
    });

    it("POST /api/v1/hira/:id/activities/:activityId/hazards should compute initial and residual risk server-side", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/hira/${hiraStudyId}/activities/${activityId}/hazards`)
        .set("Authorization", `Bearer ${hseToken}`)
        .send({
          hazardCategory: HazardCategory.CHEMICAL,
          hazardDescription:
            "Pyrophoric catalyst dust ignition and toxic gas exposure during vacuum extraction",
          consequence:
            "Flash fire inside reactor, respiratory trauma, potential personnel burns",
          initialSeverity: 5, // Catastrophic
          initialLikelihood: 4, // Probable -> Initial Score 20 (CRITICAL)
          controls: [
            {
              type: ControlHierarchyType.ENGINEERING,
              description:
                "Nitrogen blanketing system with redundant continuous O2/LEL gas detectors",
              effectivenessPercent: 85,
              isExisting: true,
            },
            {
              type: ControlHierarchyType.ADMINISTRATIVE,
              description:
                "Confined space entry permit, spark-proof non-conductive tooling, fire watch stationed",
              effectivenessPercent: 75,
              isExisting: true,
            },
            {
              type: ControlHierarchyType.PPE,
              description:
                "Positive-pressure supplied air breathing apparatus (SCBA) and flash-fire resistant suit",
              effectivenessPercent: 80,
              isExisting: true,
            },
          ],
          alarpJustification:
            "Residual risk is reduced to As Low As Reasonably Practicable via triple barrier hierarchy controls",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      const hazard = res.body.data;
      expect(hazard.id).toBeDefined();
      hazardId = hazard.id;
      expect(hazardId).toBeDefined();

      // Assert Server-side Risk Calculations
      expect(hazard.initialRiskScore).toBe(20);
      expect(hazard.initialRiskLevel).toBe("CRITICAL");
      expect(hazard.residualRiskScore).toBeLessThan(hazard.initialRiskScore);
      expect(hazard.residualRiskScore).toBeGreaterThanOrEqual(1);
      expect(hazard.alarpJustified).toBe(true);
    });
  });

  describe("4. Workflow Invariant Enforcement: No Shortcut PATCH Allowed", () => {
    it("Direct PATCH status change on HIRA study should be disallowed", async () => {
      // Direct PATCH route does not exist or status cannot be mutated via PATCH
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/hira/${hiraStudyId}`)
        .set("Authorization", `Bearer ${hseToken}`)
        .send({ status: "APPROVED" });

      // Must be 404 (route not found) or 400 (validation rejected)
      expect([400, 404]).toContain(res.status);

      // Verify status remains unchanged in database (retains authoritative state IN_PROGRESS)
      const verifyRes = await request(app.getHttpServer())
        .get(`/api/v1/hira/${hiraStudyId}`)
        .set("Authorization", `Bearer ${hseToken}`)
        .expect(200);

      expect(verifyRes.body.data.status).toBe("IN_PROGRESS");
    });
  });

  describe("5. Workflow Engine: Explicit Action State Transitions", () => {
    it("POST /api/v1/hira/:id/actions/submit should transition DRAFT to TEAM_REVIEW", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/hira/${hiraStudyId}/actions/submit`)
        .set("Authorization", `Bearer ${hseToken}`)
        .send({
          comments:
            "Hazard evaluation and hierarchy of controls completed. Submitting for safety team review.",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("TEAM_REVIEW");
    });

    it("Attempting invalid transition should be rejected with 400 Bad Request", async () => {
      // Already in TEAM_REVIEW; submitting again is not an allowed transition
      const res = await request(app.getHttpServer())
        .post(`/api/v1/hira/${hiraStudyId}/actions/submit`)
        .set("Authorization", `Bearer ${hseToken}`)
        .send({
          comments: "Duplicate submission attempt",
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it("POST /api/v1/hira/:id/actions/review?decision=RECOMMEND should transition to APPROVAL_PENDING", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/hira/${hiraStudyId}/actions/review?decision=RECOMMEND`)
        .set("Authorization", `Bearer ${hseToken}`)
        .send({
          comments:
            "Team review conducted. All high-risk hazards adequately mitigated via engineering and administrative barriers.",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("APPROVAL_PENDING");
    });

    it("POST /api/v1/hira/:id/actions/approve should formally approve the study", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/hira/${hiraStudyId}/actions/approve`)
        .set("Authorization", `Bearer ${hseToken}`)
        .send({
          comments:
            "Formal management approval granted for catalyst overhaul under nitrogen purge protocols.",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("APPROVED");
    });

    it("POST /api/v1/hira/:id/actions/activate should activate the study for operational execution", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/hira/${hiraStudyId}/actions/activate`)
        .set("Authorization", `Bearer ${hseToken}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ACTIVE");
    });
  });

  describe("6. Transactional Audit Log Verification", () => {
    it("GET /api/v1/audit/entities/HiraStudy/:id should contain complete immutable audit trail", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/audit/entities/HiraStudy/${hiraStudyId}`)
        .set("Authorization", `Bearer ${hseToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      const actions = res.body.data.map(
        (log: { action: string }) => log.action,
      );
      expect(actions).toContain("HIRA.CREATE");
      expect(actions).toContain("HIRA.SUBMIT");
    });
  });

  describe("7. Unified Inbox & Workflow Tasks", () => {
    it("GET /api/v1/inbox should return inbox task aggregation", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/inbox")
        .set("Authorization", `Bearer ${hseToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.counts).toBeDefined();
      expect(typeof res.body.data.counts.totalPending).toBe("number");
      expect(Array.isArray(res.body.data.sections.myTasks)).toBe(true);
    });
  });
});
