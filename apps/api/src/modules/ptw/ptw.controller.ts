import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PtwService } from './ptw.service';
import { CreatePtwDto, PtwActionDto } from './dto/ptw.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUserContext } from '../auth/interfaces/auth.interface';
import { Permissions } from '@kenzo-ehs/types';

@ApiTags('Permit To Work')
@Controller('ptw')
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
@ApiBearerAuth()
export class PtwController {
  constructor(private readonly ptwService: PtwService) {}

  @Post()
  @RequirePermissions(Permissions.PTW_CREATE)
  @ApiOperation({ summary: 'Create a new Permit to Work' })
  async create(@Body() dto: CreatePtwDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.ptwService.create(dto, user);
  }

  @Get()
  @RequirePermissions(Permissions.PTW_READ)
  @ApiOperation({ summary: 'List permits to work in plant scope' })
  async findAll(@CurrentUser() user: AuthenticatedUserContext, @Query('plantId') plantId?: string) {
    return this.ptwService.findAll(user, plantId);
  }

  @Get(':id')
  @RequirePermissions(Permissions.PTW_READ)
  @ApiOperation({ summary: 'Get permit to work details' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUserContext) {
    return this.ptwService.findById(id, user);
  }

  @Post(':id/actions/submit')
  @RequirePermissions(Permissions.PTW_SUBMIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit permit to work for safety review' })
  async submit(@Param('id') id: string, @Body() dto: PtwActionDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.ptwService.executeAction(id, 'SUBMIT', user, dto);
  }

  @Post(':id/actions/safety-review')
  @RequirePermissions(Permissions.PTW_APPROVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform safety review of permit' })
  async safetyReview(@Param('id') id: string, @Body() dto: PtwActionDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.ptwService.executeAction(id, 'SAFETY_REVIEW', user, dto);
  }

  @Post(':id/actions/approve')
  @RequirePermissions(Permissions.PTW_APPROVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve permit to work' })
  async approve(@Param('id') id: string, @Body() dto: PtwActionDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.ptwService.executeAction(id, 'APPROVE', user, dto);
  }

  @Post(':id/actions/activate')
  @RequirePermissions(Permissions.PTW_APPROVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate approved permit for hot work/operations' })
  async activate(@Param('id') id: string, @Body() dto: PtwActionDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.ptwService.executeAction(id, 'ACTIVATE', user, dto);
  }

  @Post(':id/actions/close')
  @RequirePermissions(Permissions.PTW_CLOSE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close completed permit to work' })
  async close(@Param('id') id: string, @Body() dto: PtwActionDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.ptwService.executeAction(id, 'CLOSE', user, dto);
  }

  @Post(':id/actions/reject')
  @RequirePermissions(Permissions.PTW_APPROVE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject permit to work' })
  async reject(@Param('id') id: string, @Body() dto: PtwActionDto, @CurrentUser() user: AuthenticatedUserContext) {
    return this.ptwService.executeAction(id, 'REJECT', user, dto);
  }
}
