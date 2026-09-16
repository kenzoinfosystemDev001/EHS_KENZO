import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUserContext } from '../auth/interfaces/auth.interface';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get in-app notifications for authenticated user' })
  async getNotifications(@CurrentUser() user: AuthenticatedUserContext) {
    return this.notificationsService.getForUser(user.id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark an in-app notification as read' })
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    await this.notificationsService.markAsRead(id, user.id);
    return { success: true };
  }
}
