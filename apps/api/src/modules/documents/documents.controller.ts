import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUserContext } from '../auth/interfaces/auth.interface';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Register uploaded document metadata' })
  async create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.findById(id, user);
  }

  @Get()
  @ApiOperation({ summary: 'Find documents associated with an entity' })
  @ApiQuery({ name: 'entityType', required: true })
  @ApiQuery({ name: 'entityId', required: true })
  async findByEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.documentsService.findByEntity(entityType, entityId, user);
  }
}
