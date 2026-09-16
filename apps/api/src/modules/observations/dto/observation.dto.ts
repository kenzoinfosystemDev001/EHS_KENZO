import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from "class-validator";
import { ObservationType } from "@prisma/client";

export class CreateObservationDto {
  @IsString() @IsNotEmpty() plantId: string;
  @IsEnum(ObservationType) type: ObservationType;
  @IsString() @IsNotEmpty() description: string;
  @IsString() @IsOptional() location?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() imageUrls?: string[];
}

export class ReviewObservationDto {
  @IsString() @IsNotEmpty() comments: string;
}
