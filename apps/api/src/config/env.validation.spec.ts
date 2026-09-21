import "reflect-metadata";
import { validateEnvironment } from "./env.validation";

describe("Environment Validation & Secrets Hardening", () => {
  const validConfig = {
    NODE_ENV: "development",
    DATABASE_URL: "postgresql://postgres:secret@localhost:5432/kenzo_ehs",
    JWT_ACCESS_SECRET: "this_is_a_super_secure_access_secret_32chars_min",
    JWT_REFRESH_SECRET: "this_is_a_super_secure_refresh_secret_32chars_min",
  };

  it("should succeed with valid configuration and 32+ character secrets", () => {
    const result = validateEnvironment(validConfig);
    expect(result.JWT_ACCESS_SECRET).toBe(validConfig.JWT_ACCESS_SECRET);
    expect(result.JWT_REFRESH_SECRET).toBe(validConfig.JWT_REFRESH_SECRET);
    expect(result.AUTH_LOGIN_MAX_ATTEMPTS).toBe(5);
  });

  it("should fail fast if DATABASE_URL is missing", () => {
    const invalidConfig = { ...validConfig, DATABASE_URL: "" };
    expect(() => validateEnvironment(invalidConfig)).toThrow(
      /DATABASE_URL must be defined/,
    );
  });

  it("should fail fast if JWT_ACCESS_SECRET is shorter than 32 characters", () => {
    const invalidConfig = { ...validConfig, JWT_ACCESS_SECRET: "too-short" };
    expect(() => validateEnvironment(invalidConfig)).toThrow(
      /JWT_ACCESS_SECRET must be at least 32 characters/,
    );
  });

  it("should fail fast if JWT_REFRESH_SECRET is shorter than 32 characters", () => {
    const invalidConfig = { ...validConfig, JWT_REFRESH_SECRET: "short" };
    expect(() => validateEnvironment(invalidConfig)).toThrow(
      /JWT_REFRESH_SECRET must be at least 32 characters/,
    );
  });
});
