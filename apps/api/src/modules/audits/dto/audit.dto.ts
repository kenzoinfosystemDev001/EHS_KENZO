import { IsString, IsNotEmpty, IsEnum } from "class-validator";
import { AuditFindingGrade } from "@prisma/client";
export class CreateAuditPlanDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() plantId: string;
}
export class AddAuditFindingDto {
  @IsString() @IsNotEmpty() description: string;
  @IsEnum(AuditFindingGrade) grade: AuditFindingGrade;
}
