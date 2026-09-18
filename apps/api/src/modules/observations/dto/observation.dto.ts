import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from "class-validator";
import { ObservationType, IncidentSeverity } from "@prisma/client";

export class CreateObservationDto {
  @IsString() @IsOptional() plantId?: string;
  @IsString() @IsOptional() departmentId?: string;
  @IsString() @IsOptional() areaId?: string;
  @IsEnum(ObservationType) @IsOptional() type?: ObservationType;
  @IsEnum(ObservationType) @IsOptional() observationType?: ObservationType;
  @IsEnum(IncidentSeverity) @IsOptional() severity?: IncidentSeverity;
  @IsString() @IsNotEmpty() description: string;
  @IsString() @IsOptional() location?: string;
  @IsString() @IsOptional() locationDetails?: string;
  @IsString() @IsOptional() immediateAction?: string;
  @IsString() @IsOptional() evidenceKey?: string;
  @IsString() @IsOptional() photoData?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() imageUrls?: string[];
}

export class ReviewObservationDto {
  @IsString() @IsNotEmpty() comments: string;
}

export class EscalateObservationDto {
  @IsString() @IsNotEmpty() action: string;
  @IsString() @IsOptional() comments?: string;
  @IsString() @IsOptional() assignedStaff?: string;
  @IsString() @IsOptional() scheduledSlot?: string;
  @IsString() @IsOptional() allocatedFunds?: string;
}
