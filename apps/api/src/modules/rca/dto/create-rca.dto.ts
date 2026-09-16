import { IsString, IsNotEmpty, IsEnum, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RcaMethodology } from "@prisma/client";

export class CreateRcaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  incidentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: RcaMethodology })
  @IsEnum(RcaMethodology)
  methodology: RcaMethodology;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  leadInvestigatorId?: string;
}

export class RcaActionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  comments: string;
}

export class AddRcaFindingDto {
  @ApiPropertyOptional()
  @IsOptional()
  whyLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  finding: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evidence?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isRootCause?: boolean;
}
