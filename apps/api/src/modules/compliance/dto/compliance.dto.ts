import { IsString, IsNotEmpty } from "class-validator";
export class CreateObligationDto {
  @IsString() @IsNotEmpty() regulationName: string;
  @IsString() @IsNotEmpty() authority: string;
  @IsString() @IsNotEmpty() obligationTitle: string;
  @IsString() @IsNotEmpty() frequency: string;
  @IsString() @IsNotEmpty() complianceStatus: string;
}
export class UpdateComplianceStatusDto {
  @IsString() @IsNotEmpty() complianceStatus: string;
}
