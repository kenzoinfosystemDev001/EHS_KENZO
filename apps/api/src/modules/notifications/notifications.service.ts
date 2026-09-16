import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationPriority, NotificationChannel } from '@prisma/client';

export interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  linkUrl?: string;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async send(params: SendNotificationParams) {
    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        priority: params.priority ?? NotificationPriority.MEDIUM,
        channel: params.channel ?? NotificationChannel.IN_APP,
        linkUrl: params.linkUrl ?? null,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
      },
    });
  }

  async getForUser(userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { items, unreadCount };
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
