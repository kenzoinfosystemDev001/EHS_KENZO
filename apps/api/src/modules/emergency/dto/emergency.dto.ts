import { IsString, IsNotEmpty, IsNumber } from "class-validator";
export class CreateDrillDto {
  @IsString() @IsNotEmpty() plantId: string;
  @IsString() @IsNotEmpty() drillType: string;
  @IsString() @IsNotEmpty() conductedDate: string;
  @IsNumber() durationMinutes: number;
  @IsNumber() participantsCount: number;
  @IsNumber() evacuationScore: number;
}
export class CreateContactDto {
  @IsString() @IsNotEmpty() plantId: string;
  @IsString() @IsNotEmpty() serviceName: string;
  @IsString() @IsNotEmpty() phoneNumber: string;
}
