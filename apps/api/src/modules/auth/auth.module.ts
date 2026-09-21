import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";

import { AuthThrottlerService } from "./auth-throttler.service";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>("JWT_ACCESS_SECRET");
        if (!secret) {
          throw new Error(
            "[FATAL] JWT_ACCESS_SECRET is missing. Production cannot start without an explicit JWT secret.",
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: (configService.get<string>("JWT_ACCESS_EXPIRATION") ||
              "15m") as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuthThrottlerService],
  exports: [AuthService, JwtStrategy, AuthThrottlerService, PassportModule],
})
export class AuthModule {}
