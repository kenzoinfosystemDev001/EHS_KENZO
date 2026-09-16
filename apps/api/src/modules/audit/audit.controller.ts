import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUserContext } from '../auth/interfaces/auth.interface';
import { Permissions } from '@kenzo-ehs/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('Audit Logs')
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('entities/:entityType/:entityId')
  @RequirePermissions(Permissions.AUDIT_LOG_READ)
  @ApiOperation({ summary: 'Get immutable audit history for an entity' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getEntityAuditHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.auditService.getEntityAuditHistory(
      user.organizationId,
      entityType,
      entityId,
      query.skip,
      query.limit ?? 20,
    );
  }
}
