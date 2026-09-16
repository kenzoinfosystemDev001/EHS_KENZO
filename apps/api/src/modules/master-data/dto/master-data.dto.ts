import { IsNotEmpty, IsString, IsOptional, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateOrganizationDto {
  @ApiProperty({ example: "ORG-DEMO" })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: "Demo Enterprise Corp" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: "demo-enterprise" })
  @IsOptional()
  @IsString()
  slug?: string;
}

export class CreatePlantDto {
  @ApiProperty({ example: "PLANT-WEST" })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: "West Zone Refinery" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: "Mumbai" })
  @IsOptional()
  @IsString()
  city?: string;
}

export class CreateDepartmentDto {
  @ApiProperty({ description: "Plant UUID" })
  @IsUUID()
  @IsNotEmpty()
  plantId!: string;

  @ApiProperty({ example: "DEPT-FIRE" })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: "Fire & Emergency Services" })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
