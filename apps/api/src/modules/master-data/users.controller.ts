import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUserContext } from '../auth/interfaces/auth.interface';
import { Permissions } from '@kenzo-ehs/types';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile (Alias for /auth/me)' })
  async getMe(@CurrentUser() user: AuthenticatedUserContext) {
    return this.masterDataService.getUserById(user.id, user);
  }

  @Get()
  @RequirePermissions(Permissions.USER_READ)
  @ApiOperation({ summary: 'List users in the organization' })
  async findAll(@CurrentUser() user: AuthenticatedUserContext) {
    return this.masterDataService.getUsers(user);
  }

  @Get(':id')
  @RequirePermissions(Permissions.USER_READ)
  @ApiOperation({ summary: 'Get user details by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.masterDataService.getUserById(id, user);
  }
}
