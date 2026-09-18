import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Explicitly configure body parsers with 50MB limit for high-res photo uploads
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Permit Swagger UI inline assets
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());

  // Dynamic CORS Configuration
  const configuredOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : [];

  const defaultAllowedOrigins = [
    "http://localhost:3000",
    "http://localhost:4000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4000",
    "http://127.0.0.1:5173",
    "https://ehs-kenzo.vercel.app",
    "https://ehskenzo.vercel.app",
    "https://ehs-kenzo.onrender.com",
  ];

  const allowedOrigins = Array.from(
    new Set([...configuredOrigins, ...defaultAllowedOrigins]),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (like mobile apps, curl, health checks)
      if (!origin) {
        return callback(null, true);
      }

      try {
        const originUrl = new URL(origin);
        // Allow if in explicitly configured list, wildcard, or matches Vercel / Render / localhost domains
        if (
          allowedOrigins.includes(origin) ||
          allowedOrigins.includes("*") ||
          /\.vercel\.app$/.test(originUrl.hostname) ||
          /localhost(:\d+)?$/.test(originUrl.host) ||
          /127\.0\.0\.1(:\d+)?$/.test(originUrl.host) ||
          /\.onrender\.com$/.test(originUrl.hostname)
        ) {
          return callback(null, true);
        }
      } catch {
        // Fallback check if URL parsing fails
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      }

      logger.warn(`CORS rejected for origin: ${origin}`);
      return callback(null, false);
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
  await app.listen(port);
  logger.log(`Kenzo EHS API is operational at http://localhost:${port}/api/v1`);
  logger.log(
    `OpenAPI Swagger documentation available at http://localhost:${port}/docs`,
  );
}

bootstrap();
