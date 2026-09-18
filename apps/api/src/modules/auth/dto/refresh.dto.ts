import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      "Cryptographic refresh token issued at login (can also be read from HTTP cookie)",
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
