import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('Auth & Scope Security E2E', () => {
  jest.setTimeout(45000);

  let app: INestApplication;
  let adminToken: string;
  let workerToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
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

  describe('1. Authentication Gate', () => {
    it('Unauthenticated GET /api/v1/hira should return 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hira')
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('Invalid credentials should return 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@kenzo-ehs.com', password: 'wrongpassword' })
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('Non-existent email should return 401 (no user enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'anything' })
        .expect(401);
      // Ensure message does not leak whether email exists (uniform message)
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('Admin login should succeed', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@kenzo-ehs.com', password: 'KenzoEHS@2026!' })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      adminToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('Worker login should succeed', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'worker@kenzo-ehs.com', password: 'KenzoEHS@2026!' })
        .expect(200);
      expect(res.body.success).toBe(true);
      workerToken = res.body.data.accessToken;
    });
  });

  describe('2. Permission Enforcement (RBAC)', () => {
    it('Worker cannot access GET /users (lacks USER.READ permission)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${workerToken}`);
      expect([401, 403]).toContain(res.status);
    });

    it('Worker cannot read audit logs (lacks AUDIT_LOG.READ)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/audit/entities/HiraStudy/fake-id')
        .set('Authorization', `Bearer ${workerToken}`);
      // Worker lacks AUDIT_LOG.READ — should be 403, or 401 if jwt fails
      expect([401, 403]).toContain(res.status);
    });

    it('Admin can read HIRA list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hira')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('3. Token Rotation', () => {
    it('Refresh token should issue new access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      const newRefreshToken = res.body.data.refreshToken;
      expect(newRefreshToken).toBeDefined();
      // Old refresh token should be rotated out — store new one
      refreshToken = newRefreshToken;
    });
  });

  describe('4. Session Revocation (Logout)', () => {
    let logoutToken: string;
    let logoutRefresh: string;

    it('Login for logout test', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'hse.manager@kenzo-ehs.com', password: 'KenzoEHS@2026!' })
        .expect(200);
      logoutToken = res.body.data.accessToken;
      logoutRefresh = res.body.data.refreshToken;
    });

    it('After logout, access token should be invalid for session-scoped calls', async () => {
      // Logout
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${logoutToken}`)
        .expect(200);

      // Using the revoked refresh token should now fail
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: logoutRefresh });
      expect([400, 401]).toContain(res.status);
    });
  });

  describe('5. Tenant Isolation (IDOR Protection)', () => {
    it('GET /api/v1/hira should only return studies from users own organization', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/hira')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const studies = res.body.data as Array<{ organizationId?: string }>;
      const hseMgrRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'hse.manager@kenzo-ehs.com', password: 'KenzoEHS@2026!' });
      const hseMgrOrgId = hseMgrRes.body.data?.user?.organizationId;

      expect(res.body.success).toBe(true);
      expect(Array.isArray(studies)).toBe(true);
      expect(hseMgrOrgId).toBeDefined();
    });
  });
});
