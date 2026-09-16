import { IsString, IsNotEmpty } from "class-validator";
export class CreateHealthRecordDto {
  @IsString() @IsNotEmpty() userId: string;
  @IsString() @IsNotEmpty() plantId: string;
  @IsString() @IsNotEmpty() examType: string;
  @IsString() @IsNotEmpty() examDate: string;
}
