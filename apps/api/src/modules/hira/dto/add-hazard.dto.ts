import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { HazardCategory, ControlHierarchyType } from "@prisma/client";

export class HiraControlInputDto {
  @ApiProperty({
    enum: ControlHierarchyType,
    example: ControlHierarchyType.ENGINEERING,
  })
  @IsEnum(ControlHierarchyType)
  type!: ControlHierarchyType;

  @ApiProperty({
    example: "Dry-disconnect safety couplings with interlock valve",
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 80, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  effectivenessPercent!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  isExisting?: boolean = true;
}

export class AddHazardDto {
  @ApiProperty({ enum: HazardCategory, example: HazardCategory.CHEMICAL })
  @IsEnum(HazardCategory)
  hazardCategory!: HazardCategory;

  @ApiProperty({
    example:
      "Pressurized release of concentrated nitric acid vapor during hose disconnect",
  })
  @IsString()
  @IsNotEmpty()
  hazardDescription!: string;

  @ApiProperty({
    example:
      "Chemical burns to operators, respiratory trauma, localized toxic cloud",
  })
  @IsString()
  @IsNotEmpty()
  consequence!: string;

  @ApiProperty({
    example: 4,
    minimum: 1,
    maximum: 5,
    description: "Severity score 1 (Negligible) to 5 (Catastrophic)",
  })
  @IsInt()
  @Min(1)
  @Max(5)
  initialSeverity!: number;

  @ApiProperty({
    example: 3,
    minimum: 1,
    maximum: 5,
    description: "Likelihood score 1 (Rare) to 5 (Almost Certain)",
  })
  @IsInt()
  @Min(1)
  @Max(5)
  initialLikelihood!: number;

  @ApiProperty({ type: [HiraControlInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HiraControlInputDto)
  controls!: HiraControlInputDto[];

  @ApiPropertyOptional({
    example:
      "Residual risk is acceptable due to engineering double isolation and full chemical suit",
  })
  @IsOptional()
  @IsString()
  alarpJustification?: string;

  @ApiPropertyOptional({
    example: "OSHA 1910.120 / Factories Act 1948 Section 41B",
  })
  @IsOptional()
  @IsString()
  regulatoryReference?: string;
}
