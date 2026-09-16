import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import { CreateOrganizationDto } from './dto/master-data.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permissions } from '@kenzo-ehs/types';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get()
  @ApiOperation({ summary: 'List organizations' })
  async findAll() {
    return this.masterDataService.getOrganizations();
  }

  @Post()
  @RequirePermissions(Permissions.ORGANIZATION_MANAGE)
  @ApiOperation({ summary: 'Create new organization tenant' })
  async create(@Body() dto: CreateOrganizationDto) {
    return this.masterDataService.createOrganization(dto);
  }
}
