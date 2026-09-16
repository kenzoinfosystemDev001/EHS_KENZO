import { Controller, Get, Post, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RcaService } from './rca.service';
import { CreateRcaDto, RcaActionDto, AddRcaFindingDto } from './dto/create-rca.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUserContext } from '../auth/interfaces/auth.interface';
import { Permissions } from '@kenzo-ehs/types';

@ApiTags('RCA')
@Controller('rca')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RcaController {
  constructor(private readonly rcaService: RcaService) {}

  @Post()
  @RequirePermissions(Permissions.RCA_CREATE)
  @ApiOperation({ summary: 'Create a new RCA study linked to an incident' })
  async create(@Body() dto: CreateRcaDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.rcaService.create(dto, user);
  }

  @Get()
  @RequirePermissions(Permissions.RCA_CREATE)
  @ApiOperation({ summary: 'List RCA studies in scope' })
  async findAll(@CurrentUser() user: AuthenticatedUserContext) {
    return this.rcaService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions(Permissions.RCA_CREATE)
  @ApiOperation({ summary: 'Get RCA study with findings' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUserContext) {
    return this.rcaService.findById(id, user);
  }

  @Post(':id/findings')
  @RequirePermissions(Permissions.RCA_UPDATE)
  @ApiOperation({ summary: 'Add a finding to the RCA study' })
  async addFinding(@Param('id') id: string, @Body() dto: AddRcaFindingDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.rcaService.addFinding(id, dto, user);
  }

  @Post(':id/actions/start')
  @RequirePermissions(Permissions.RCA_UPDATE)
  @HttpCode(HttpStatus.OK)
  async start(@Param('id') id: string, @Body() dto: RcaActionDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.rcaService.executeAction(id, 'START', user, dto);
  }

  @Post(':id/actions/submit')
  @RequirePermissions(Permissions.RCA_SUBMIT)
  @HttpCode(HttpStatus.OK)
  async submit(@Param('id') id: string, @Body() dto: RcaActionDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.rcaService.executeAction(id, 'SUBMIT_REVIEW', user, dto);
  }

  @Post(':id/actions/approve')
  @RequirePermissions(Permissions.RCA_APPROVE)
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string, @Body() dto: RcaActionDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.rcaService.executeAction(id, 'APPROVE', user, dto);
  }

  @Post(':id/actions/rework')
  @RequirePermissions(Permissions.RCA_UPDATE)
  @HttpCode(HttpStatus.OK)
  async rework(@Param('id') id: string, @Body() dto: RcaActionDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.rcaService.executeAction(id, 'REWORK', user, dto);
  }
}
