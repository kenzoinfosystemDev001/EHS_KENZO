import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TeamMemberDto {
  @ApiProperty({ description: "User UUID of team member" })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: "FACILITATOR" })
  @IsString()
  @IsNotEmpty()
  roleTitle!: string;
}

export class CreateHiraStudyDto {
  @ApiProperty({ example: "HIRA for Nitric Acid Storage & Handling" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    example: "Comprehensive risk assessment of chemical offloading and storage",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Plant UUID" })
  @IsUUID()
  @IsNotEmpty()
  plantId!: string;

  @ApiProperty({ description: "Department UUID" })
  @IsUUID()
  @IsNotEmpty()
  departmentId!: string;

  @ApiPropertyOptional({ description: "Area UUID" })
  @IsOptional()
  @IsUUID()
  areaId?: string;

  @ApiProperty({ description: "Study Leader User UUID" })
  @IsUUID()
  @IsNotEmpty()
  leaderId!: string;

  @ApiProperty({
    type: [TeamMemberDto],
    description: "Cross-functional team members",
  })
  @IsArray()
  @ArrayMinSize(1, {
    message: "A HIRA study must include at least one team member",
  })
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  teamMembers!: TeamMemberDto[];
}
