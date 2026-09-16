import { IsString, IsNotEmpty, IsNumber } from "class-validator";
export class LogMetricDto {
  @IsString() @IsNotEmpty() plantId: string;
  @IsString() @IsNotEmpty() metricType: string;
  @IsNumber() quantity: number;
  @IsString() @IsNotEmpty() unit: string;
  @IsString() @IsNotEmpty() logDate: string;
}
