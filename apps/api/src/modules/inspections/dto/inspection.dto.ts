import { IsString, IsNotEmpty, IsNumber } from "class-validator";
export class CreateTemplateDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() plantId: string;
}
export class ExecuteInspectionDto {
  @IsString() @IsNotEmpty() templateId: string;
  @IsNumber() score: number;
}
