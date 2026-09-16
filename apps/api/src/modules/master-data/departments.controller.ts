import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import { CreateDepartmentDto } from './dto/master-data.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUserContext } from '../auth/interfaces/auth.interface';
import { Permissions } from '@kenzo-ehs/types';

@ApiTags('Departments')
@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DepartmentsController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get()
  @ApiOperation({ summary: 'List departments within organization, optionally filtered by plant' })
  @ApiQuery({ name: 'plantId', required: false, type: String })
  async findAll(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query('plantId') plantId?: string,
  ) {
    return this.masterDataService.getDepartments(user, plantId);
  }

  @Post()
  @RequirePermissions(Permissions.DEPARTMENT_MANAGE)
  @ApiOperation({ summary: 'Create new department' })
  async create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.masterDataService.createDepartment(dto, user);
  }
}
