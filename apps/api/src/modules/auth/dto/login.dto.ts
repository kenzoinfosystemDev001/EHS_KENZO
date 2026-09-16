import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "hse.manager@kenzo-ehs.com" })
  @IsEmail({}, { message: "Invalid email address format" })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: "SecureP@ssw0rd2026!" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @IsNotEmpty()
  password!: string;
}
