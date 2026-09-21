import { plainToInstance } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  validateSync,
} from "class-validator";

export enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNotEmpty({ message: "DATABASE_URL must be defined and non-empty." })
  @IsString()
  DATABASE_URL: string;

  @IsNotEmpty({
    message:
      "JWT_ACCESS_SECRET must be defined. Hardcoded fallback secrets are strictly prohibited.",
  })
  @IsString()
  @MinLength(32, {
    message: "JWT_ACCESS_SECRET must be at least 32 characters long.",
  })
  JWT_ACCESS_SECRET: string;

  @IsNotEmpty({
    message:
      "JWT_REFRESH_SECRET must be defined. Hardcoded fallback secrets are strictly prohibited.",
  })
  @IsString()
  @MinLength(32, {
    message: "JWT_REFRESH_SECRET must be at least 32 characters long.",
  })
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRATION?: string = "15m";

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRATION?: string = "7d";

  @IsOptional()
  @IsNumber()
  @Min(1)
  AUTH_LOGIN_MAX_ATTEMPTS?: number = 5;

  @IsOptional()
  @IsNumber()
  @Min(10)
  AUTH_LOGIN_WINDOW_SECONDS?: number = 300;

  @IsOptional()
  @IsNumber()
  @Min(10)
  AUTH_LOGIN_LOCK_SECONDS?: number = 900;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(", "))
      .join("; ");
    throw new Error(
      `[FATAL CONFIGURATION ERROR] Environment validation failed: ${errorMessages}`,
    );
  }

  return validatedConfig;
}
