import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CapaType, CapaPriority } from "@prisma/client";

export class CreateCapaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  plantId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: CapaType })
  @IsEnum(CapaType)
  capaType: CapaType;

  @ApiProperty({ enum: CapaPriority })
  @IsEnum(CapaPriority)
  priority: CapaPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incidentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rcaStudyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;
}

export class CapaActionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  comments: string;

  @ApiPropertyOptional({ description: "Assignee user ID (for ASSIGN action)" })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: "Effectiveness rating 1-5 (for VERIFY action)",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  effectivenessRating?: number;
}
