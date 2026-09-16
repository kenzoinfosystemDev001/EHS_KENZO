import { IsNotEmpty, IsString, IsOptional, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class HiraActionDto {
  @ApiProperty({
    example:
      "Verified all engineering controls and chemical suit availability. Approved for operation.",
  })
  @IsString()
  @IsNotEmpty({
    message:
      "Action comments/justification are required for audit traceability",
  })
  comments!: string;

  @ApiPropertyOptional({
    default: false,
    description:
      "Required if approving a study containing critical/unacceptable residual risk",
  })
  @IsOptional()
  @IsBoolean()
  overrideUnacceptableRisk?: boolean = false;
}
