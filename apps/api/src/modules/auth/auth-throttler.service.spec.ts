import { ConfigService } from "@nestjs/config";
import { AuthThrottlerService } from "./auth-throttler.service";
import { HttpException, HttpStatus } from "@nestjs/common";

describe("AuthThrottlerService (Rate Limiting & Lockout)", () => {
  let service: AuthThrottlerService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === "AUTH_LOGIN_MAX_ATTEMPTS") return 3;
        if (key === "AUTH_LOGIN_WINDOW_SECONDS") return 60;
        if (key === "AUTH_LOGIN_LOCK_SECONDS") return 120;
        return undefined;
      }),
    };
    service = new AuthThrottlerService(mockConfigService as ConfigService);
  });

  it("should permit initial login attempt", () => {
    expect(() =>
      service.assertLoginAllowed("127.0.0.1", "worker@kenzo-ehs.com"),
    ).not.toThrow();
  });

  it("should track failed attempts and lockout after threshold is reached", () => {
    const ip = "192.168.1.100";
    const email = "test@kenzo-ehs.com";

    // Attempt 1
    const res1 = service.recordLoginFailure(ip, email);
    expect(res1.attemptsLeft).toBe(2);
    expect(res1.locked).toBe(false);

    // Attempt 2
    const res2 = service.recordLoginFailure(ip, email);
    expect(res2.attemptsLeft).toBe(1);
    expect(res2.locked).toBe(false);

    // Attempt 3 (Threshold reached -> Lockout)
    const res3 = service.recordLoginFailure(ip, email);
    expect(res3.attemptsLeft).toBe(0);
    expect(res3.locked).toBe(true);

    // Subsequent attempt throws 429 Too Many Requests
    expect(() => service.assertLoginAllowed(ip, email)).toThrow(
      HttpException,
    );

    try {
      service.assertLoginAllowed(ip, email);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.getResponse().message).toContain("Too many failed login attempts");
    }
  });

  it("should reset attempt counter upon successful login", () => {
    const ip = "10.0.0.1";
    const email = "user@kenzo-ehs.com";

    service.recordLoginFailure(ip, email);
    service.recordLoginFailure(ip, email);

    // User enters correct password
    service.recordLoginSuccess(ip, email);

    // Should now be permitted without restriction
    expect(() => service.assertLoginAllowed(ip, email)).not.toThrow();
  });
});
