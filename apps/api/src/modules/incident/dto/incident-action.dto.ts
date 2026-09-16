import { IsString, IsNotEmpty, IsOptional, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class IncidentActionDto {
  @ApiProperty({
    description: "Mandatory comments for this workflow action",
    minLength: 5,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  comments: string;

  @ApiPropertyOptional({ description: "Additional metadata payload" })
  @IsOptional()
  payload?: Record<string, unknown>;
}
