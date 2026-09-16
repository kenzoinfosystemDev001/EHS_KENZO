import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiProperty({ description: "Cryptographic refresh token issued at login" })
  @IsString()
  @IsNotEmpty({ message: "Refresh token is required" })
  refreshToken!: string;
}
