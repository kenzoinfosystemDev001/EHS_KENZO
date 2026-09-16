import { IsString, IsNotEmpty } from "class-validator";
export class CreateContractorDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() plantId: string;
  @IsString() @IsNotEmpty() registrationNo: string;
  @IsString() @IsNotEmpty() contactEmail: string;
}
export class CreateContractorWorkerDto {
  @IsString() @IsNotEmpty() fullName: string;
  @IsString() @IsNotEmpty() trade: string;
  @IsString() @IsNotEmpty() badgeNumber: string;
}
