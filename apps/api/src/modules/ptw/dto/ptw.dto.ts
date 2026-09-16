import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PtwCategory } from "@prisma/client";

export class CreatePtwDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  plantId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  areaId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workDescription: string;

  @ApiProperty({ enum: PtwCategory })
  @IsEnum(PtwCategory)
  category: PtwCategory;

  @ApiProperty()
  @IsDateString()
  plannedStartDate: string;

  @ApiProperty()
  @IsDateString()
  plannedEndDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hazardsIdentified?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  precautions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyProcedures?: string;
}

export class PtwActionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  comments: string;
}
