import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma, OutboxEvent } from "@prisma/client";

export interface EmitEventParams {
  organizationId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  headers?: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
}

export type OutboxEventHandler = (event: OutboxEvent) => Promise<void>;

const MAX_RETRIES = 5;

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly handlers = new Map<string, OutboxEventHandler[]>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers a subscriber handler for a specific event type.
   */
  registerHandler(eventType: string, handler: OutboxEventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
    this.logger.log(`Registered handler for outbox event: ${eventType}`);
  }

  /**
   * Persists an outbox event atomically within a database transaction.
   * Supports idempotency key deduplication.
   */
  async emit(params: EmitEventParams): Promise<OutboxEvent> {
    const client = params.tx || this.prisma;
    const idempotencyKey = params.headers?.idempotencyKey as string | undefined;

    if (idempotencyKey) {
      // Check if an event with this idempotency key was already staged
      const existing = await client.outboxEvent.findFirst({
        where: {
          organizationId: params.organizationId,
          aggregateType: params.aggregateType,
          aggregateId: params.aggregateId,
          eventType: params.eventType,
          headers: {
            path: ["idempotencyKey"],
            equals: idempotencyKey,
          },
        },
      });

      if (existing) {
        this.logger.warn(
          `Idempotent duplicate event detected for key [${idempotencyKey}]. Skipping staging.`,
        );
        return existing;
      }
    }

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
   * Processes pending outbox events with exponential backoff and dead-letter protection.
   */
  async processPendingEvents(batchSize: number = 20): Promise<number> {
    const now = Date.now();

    // Fetch unprocessed events that have not exceeded the dead-letter threshold
    const pendingEvents = await this.prisma.outboxEvent.findMany({
      where: {
        processedAt: null,
        retryCount: { lt: MAX_RETRIES },
      },
      orderBy: { createdAt: "asc" },
      take: batchSize * 2, // Fetch a slightly larger batch to allow for backoff filtering
    });

    if (pendingEvents.length === 0) return 0;

    let processedCount = 0;

    for (const event of pendingEvents) {
      if (processedCount >= batchSize) break;

      // Exponential backoff check: delay = min(300s, 2^retryCount * 5s)
      if (event.retryCount > 0) {
        const backoffSeconds = Math.min(300, Math.pow(2, event.retryCount) * 5);
        const eventAgeSeconds = (now - new Date(event.createdAt).getTime()) / 1000;
        if (eventAgeSeconds < backoffSeconds) {
          continue; // Backoff period not yet elapsed
        }
      }

      try {
        this.logger.log(
          `Dispatching outbox event [${event.id}]: ${event.eventType} (Attempt ${event.retryCount + 1})`,
        );

        // Execute registered domain handlers
        const registeredHandlers = this.handlers.get(event.eventType) || [];
        for (const handler of registeredHandlers) {
          await handler(event);
        }

        // Mark as successfully processed
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date(), lastError: null },
        });

        processedCount++;
      } catch (err: any) {
        const nextRetry = event.retryCount + 1;
        const isDeadLetter = nextRetry >= MAX_RETRIES;
        const errorMessage = isDeadLetter
          ? `[DEAD_LETTER] Exceeded max retries (${MAX_RETRIES}): ${err.message}`
          : err.message;

        this.logger.error(
          `Failed to process outbox event [${event.id}]: ${errorMessage}`,
        );

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            retryCount: nextRetry,
            lastError: errorMessage,
          },
        });
      }
    }

    return processedCount;
  }
}
