import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";

export class CreateActionDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() plantId: string;
  @IsString() @IsNotEmpty() dueDate: string;
}

export class UpdateActionDto {
  @IsNumber() progress: number;
}

export class VerifyActionDto {
  @IsString() @IsOptional() comments?: string;
}
