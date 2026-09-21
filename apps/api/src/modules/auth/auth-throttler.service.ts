import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

@Injectable()
export class AuthThrottlerService {
  private readonly logger = new Logger(AuthThrottlerService.name);

  private readonly maxLoginAttempts: number;
  private readonly loginWindowMs: number;
  private readonly loginLockoutMs: number;

  private readonly maxRefreshAttempts: number;
  private readonly refreshWindowMs: number;

  private readonly loginAttempts = new Map<string, AttemptRecord>();
  private readonly refreshAttempts = new Map<string, AttemptRecord>();

  constructor(private readonly configService: ConfigService) {
    this.maxLoginAttempts = Number(
      this.configService.get<number>("AUTH_LOGIN_MAX_ATTEMPTS") || 5,
    );
    this.loginWindowMs =
      Number(this.configService.get<number>("AUTH_LOGIN_WINDOW_SECONDS") || 300) *
      1000;
    this.loginLockoutMs =
      Number(this.configService.get<number>("AUTH_LOGIN_LOCK_SECONDS") || 900) *
      1000;

    this.maxRefreshAttempts = 30; // Max 30 refresh calls per minute
    this.refreshWindowMs = 60 * 1000;

    // Periodic sweep to prevent memory leaks (every 10 minutes)
    setInterval(() => this.cleanupExpiredRecords(), 10 * 60 * 1000).unref();
  }

  /**
   * Generates a composite throttling key
   */
  private buildKey(ip?: string, identifier?: string): string {
    const safeIp = (ip || "unknown-ip").trim().toLowerCase();
    const safeId = (identifier || "general").trim().toLowerCase();
    return `${safeIp}:${safeId}`;
  }

  /**
   * Asserts that a login attempt is permitted. Throws 429 Too Many Requests if locked.
   */
  assertLoginAllowed(ip?: string, email?: string): void {
    const key = this.buildKey(ip, email);
    const now = Date.now();
    const record = this.loginAttempts.get(key);

    if (!record) return;

    // Check if currently locked out
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      this.logger.warn(
        `Blocked login attempt for locked target: [${key}]. Remaining lockout: ${remainingSeconds}s`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "Too Many Requests",
          message: `Too many failed login attempts. Access is temporarily locked for security. Please try again in ${Math.ceil(remainingSeconds / 60)} minute(s).`,
          retryAfter: remainingSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Reset window if window duration has elapsed
    if (now - record.firstAttemptAt > this.loginWindowMs && !record.lockedUntil) {
      this.loginAttempts.delete(key);
    }
  }

  /**
   * Records a failed login attempt, potentially triggering temporary lockout.
   */
  recordLoginFailure(ip?: string, email?: string): {
    attemptsLeft: number;
    locked: boolean;
  } {
    const key = this.buildKey(ip, email);
    const now = Date.now();
    let record = this.loginAttempts.get(key);

    if (!record || (now - record.firstAttemptAt > this.loginWindowMs && !record.lockedUntil)) {
      record = { count: 1, firstAttemptAt: now };
    } else {
      record.count += 1;
    }

    let locked = false;
    if (record.count >= this.maxLoginAttempts) {
      record.lockedUntil = now + this.loginLockoutMs;
      locked = true;
      this.logger.warn(
        `Rate limit threshold reached: Locking [${key}] for ${this.loginLockoutMs / 1000}s`,
      );
    }

    this.loginAttempts.set(key, record);

    return {
      attemptsLeft: Math.max(0, this.maxLoginAttempts - record.count),
      locked,
    };
  }

  /**
   * Clears failure records upon successful login.
   */
  recordLoginSuccess(ip?: string, email?: string): void {
    const key = this.buildKey(ip, email);
    this.loginAttempts.delete(key);
  }

  /**
   * Asserts that a token refresh attempt is permitted to prevent refresh flooding.
   */
  assertRefreshAllowed(ip?: string, identifier?: string): void {
    const key = this.buildKey(ip, identifier);
    const now = Date.now();
    let record = this.refreshAttempts.get(key);

    if (!record || now - record.firstAttemptAt > this.refreshWindowMs) {
      record = { count: 1, firstAttemptAt: now };
      this.refreshAttempts.set(key, record);
      return;
    }

    record.count += 1;
    if (record.count > this.maxRefreshAttempts) {
      this.logger.warn(`Excessive refresh token requests from [${key}]`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "Too Many Requests",
          message: "Too many token refresh requests. Please slow down.",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Periodic memory cleanup of expired records.
   */
  private cleanupExpiredRecords(): void {
    const now = Date.now();
    for (const [key, record] of this.loginAttempts.entries()) {
      if (
        (!record.lockedUntil && now - record.firstAttemptAt > this.loginWindowMs) ||
        (record.lockedUntil && record.lockedUntil < now)
      ) {
        this.loginAttempts.delete(key);
      }
    }
    for (const [key, record] of this.refreshAttempts.entries()) {
      if (now - record.firstAttemptAt > this.refreshWindowMs) {
        this.refreshAttempts.delete(key);
      }
    }
  }
}
