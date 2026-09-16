import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUserContext } from '../auth/interfaces/auth.interface';
import { Permissions } from '@kenzo-ehs/types';

class CreateAreaDto {
  @IsString() @IsNotEmpty() plantId: string;
  @IsString() @IsNotEmpty() departmentId: string;
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() description?: string;
}

@ApiTags('Areas')
@Controller('areas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AreasController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get()
  @ApiOperation({ summary: 'List areas filtered by department/plant' })
  async findAll(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query('departmentId') departmentId?: string,
    @Query('plantId') plantId?: string,
  ) {
    return this.masterDataService.getAreas(user, departmentId, plantId);
  }

  @Post()
  @RequirePermissions(Permissions.DEPARTMENT_MANAGE)
  @ApiOperation({ summary: 'Create a new area within a department' })
  async create(@Body() dto: CreateAreaDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.masterDataService.createArea({
      organizationId: user.organizationId,
      plantId: dto.plantId,
      departmentId: dto.departmentId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
    });
  }
}
