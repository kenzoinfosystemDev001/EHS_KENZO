import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Strict Request Body Limits (2MB for standard JSON/forms; dedicated mechanisms for files)
  app.useBodyParser("json", { limit: "2mb" });
  app.useBodyParser("urlencoded", { extended: true, limit: "2mb" });

  const isProduction = process.env.NODE_ENV === "production";

  // 2. Production Security Headers & Content Security Policy (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Swagger UI
            "'unsafe-eval'",
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
          connectSrc: [
            "'self'",
            process.env.WEB_APP_URL || "http://localhost:3000",
            "https://res.cloudinary.com",
          ],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: "deny" },
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );

  app.use(cookieParser());

  // 3. Hardened CORS Configuration (Eliminated unconstrained wildcards in production)
  const explicitOrigins = [
    process.env.CORS_ALLOWED_ORIGINS,
    process.env.CORS_ORIGIN,
    process.env.WEB_APP_URL,
    process.env.ADMIN_APP_URL,
    process.env.MOBILE_APP_ORIGIN,
  ]
    .filter(Boolean)
    .flatMap((val) => val!.split(","))
    .map((o) => o.trim())
    .filter(Boolean);

  const productionAllowedOrigins = new Set([
    ...explicitOrigins,
    "https://ehs-kenzo.vercel.app",
    "https://ehskenzo.vercel.app",
    "https://ehs-kenzo.onrender.com",
  ]);

  const developmentAllowedOrigins = new Set([
    ...productionAllowedOrigins,
    "http://localhost:3000",
    "http://localhost:4000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4000",
    "http://127.0.0.1:5173",
  ]);

  const allowedOriginsSet = isProduction
    ? productionAllowedOrigins
    : developmentAllowedOrigins;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (e.g. mobile native apps, curl, server-to-server, health checks)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOriginsSet.has(origin)) {
        return callback(null, true);
      }

      // In non-production only, allow dynamic local development ports
      if (!isProduction) {
        try {
          const originUrl = new URL(origin);
          if (
            originUrl.hostname === "localhost" ||
            originUrl.hostname === "127.0.0.1"
          ) {
            return callback(null, true);
          }
        } catch {}
      }

      logger.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "X-Request-Id",
      "Idempotency-Key",
    ],
    exposedHeaders: ["X-Request-Id"],
  });

  app.setGlobalPrefix("api/v1");

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableShutdownHooks();

  // OpenAPI Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle("Kenzo EHS Enterprise API")
    .setDescription(
      "Enterprise Environment, Health & Safety Management Platform REST API with 19-Role RBAC & Multi-Plant Scope",
    )
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT || process.env.API_PORT || 4000;
  const host = process.env.HOST || "0.0.0.0";
  await app.listen(port, host);
  logger.log(
    `Kenzo EHS API is operational at http://${host === "0.0.0.0" ? "localhost" : host}:${port}/api/v1`,
  );
  logger.log(
    `OpenAPI Swagger documentation available at http://${host === "0.0.0.0" ? "localhost" : host}:${port}/docs`,
  );
}

bootstrap();
