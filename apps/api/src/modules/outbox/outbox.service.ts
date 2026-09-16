import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface EmitEventParams {
  organizationId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  headers?: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists an outbox event atomically within a database transaction.
   */
  async emit(params: EmitEventParams) {
    const client = params.tx || this.prisma;

    const event = await client.outboxEvent.create({
      data: {
        organizationId: params.organizationId,
        aggregateType: params.aggregateType,
        aggregateId: params.aggregateId,
        eventType: params.eventType,
        payload: params.payload as Prisma.InputJsonValue,
        headers: (params.headers as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    this.logger.debug(
      `Outbox event staged [${event.id}] ${params.eventType} for ${params.aggregateType}(${params.aggregateId})`,
    );

    return event;
  }

  /**
   * Processes pending outbox events (Background queue worker simulation)
   */
  async processPendingEvents(batchSize: number = 20): Promise<number> {
    const pendingEvents = await this.prisma.outboxEvent.findMany({
      where: { processedAt: null },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    if (pendingEvents.length === 0) return 0;

    let processedCount = 0;
    for (const event of pendingEvents) {
      try {
        this.logger.log(`Dispatching outbox event [${event.id}]: ${event.eventType}`);
        // Dispatch event to handlers (e.g. In-App Notification / Email / Analytics)
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date() },
        });
        processedCount++;
      } catch (err: any) {
        this.logger.error(`Failed to process outbox event [${event.id}]: ${err.message}`);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            retryCount: { increment: 1 },
            lastError: err.message,
          },
        });
      }
    }

    return processedCount;
  }
}
