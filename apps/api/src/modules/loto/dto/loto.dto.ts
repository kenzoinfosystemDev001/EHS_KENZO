import { IsString, IsNotEmpty } from "class-validator";
export class CreateLotoEquipmentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() plantId: string;
}
export class ApplyIsolationDto {
  @IsString() @IsNotEmpty() equipmentId: string;
  @IsString() @IsNotEmpty() lockNumber: string;
}
