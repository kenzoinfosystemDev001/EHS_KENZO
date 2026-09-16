import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddActivityDto {
  @ApiProperty({ example: "Chemical Tanker Offloading" })
  @IsString()
  @IsNotEmpty()
  activityName!: string;

  @ApiPropertyOptional({
    example: "Connecting transfer hose and pressurizing offloading line",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isRoutine?: boolean = true;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sequenceOrder?: number = 1;
}
