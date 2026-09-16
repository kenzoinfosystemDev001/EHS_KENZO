import { IsNotEmpty, IsString, IsOptional, IsInt, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentClassification } from '@prisma/client';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Nitric Acid P&ID Diagram' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'PID-NA-001.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({ example: 1048576, description: 'File size in bytes' })
  @IsInt()
  fileSize!: number;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({ example: 's3://kenzo-ehs/documents/2026/09/PID-NA-001.pdf' })
  @IsString()
  @IsNotEmpty()
  storageKey!: string;

  @ApiProperty({ example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' })
  @IsString()
  @IsNotEmpty()
  sha256Hash!: string;

  @ApiPropertyOptional({ enum: DocumentClassification, default: DocumentClassification.INTERNAL })
  @IsOptional()
  @IsEnum(DocumentClassification)
  classification?: DocumentClassification = DocumentClassification.INTERNAL;

  @ApiPropertyOptional({ example: 'HiraStudy' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  plantId?: string;
}
