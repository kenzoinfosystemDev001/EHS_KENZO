import { IsString, IsNotEmpty, IsNumber } from "class-validator";
export class LogManhoursDto {
  @IsString() @IsNotEmpty() plantId: string;
  @IsNumber() year: number;
  @IsNumber() month: number;
  @IsNumber() employeeManhours: number;
  @IsNumber() contractorManhours: number;
}
