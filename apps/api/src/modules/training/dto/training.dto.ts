import { IsString, IsNotEmpty } from "class-validator";
export class CreateCourseDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() plantId: string;
}
export class CreateSessionDto {
  @IsString() @IsNotEmpty() courseId: string;
  @IsString() @IsNotEmpty() scheduledDate: string;
}
export class RecordTrainingDto {
  @IsString() @IsNotEmpty() courseId: string;
  @IsString() @IsNotEmpty() userId: string;
}
