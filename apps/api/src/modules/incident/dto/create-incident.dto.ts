import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentType, IncidentSeverity } from '@prisma/client';

export class CreateIncidentDto {
  @ApiProperty({ description: 'Plant ID where incident occurred' })
  @IsString()
  @IsNotEmpty()
  plantId: string;

  @ApiProperty({ description: 'Department ID' })
  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @ApiPropertyOptional({ description: 'Area ID' })
  @IsOptional()
  @IsString()
  areaId?: string;

  @ApiProperty({ description: 'Brief incident title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Detailed description of what happened' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: IncidentType })
  @IsEnum(IncidentType)
  incidentType: IncidentType;

  @ApiProperty({ enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;

  @ApiProperty({ description: 'Date/time of incident (ISO 8601)' })
  @IsDateString()
  incidentDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incidentTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  immediateActions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isStatutoryRequired?: boolean;
}
