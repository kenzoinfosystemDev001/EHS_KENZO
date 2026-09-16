import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface RecordAuditParams {
  organizationId: string;
  plantId?: string | null;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an immutable audit log entry inside or outside a database transaction.
   */
  async log(params: RecordAuditParams) {
    const client = params.tx || this.prisma;

    // Calculate diff between beforeState and afterState if both exist
    const diff = this.calculateDiff(params.beforeState, params.afterState);

    const auditEntry = await client.auditLog.create({
      data: {
        organizationId: params.organizationId,
        plantId: params.plantId ?? null,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        requestId: params.requestId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        beforeState: (params.beforeState as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        afterState: (params.afterState as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        diff: (diff as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        reason: params.reason ?? null,
        metadata: (params.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    this.logger.debug(
      `Audit recorded [${auditEntry.id}] Action: ${params.action} Entity: ${params.entityType} (${params.entityId}) by Actor: ${params.actorId}`,
    );

    return auditEntry;
  }

  /**
   * Queries audit logs for a given entity with ordering and pagination.
   */
  async getEntityAuditHistory(
    organizationId: string,
    entityType: string,
    entityId: string,
    skip: number = 0,
    take: number = 20,
  ) {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          organizationId,
          entityType,
          entityId,
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          organizationId,
          entityType,
          entityId,
        },
      }),
    ]);

    return { items, total };
  }

  /**
   * Computes a structured JSON diff of changed fields.
   */
  private calculateDiff(
    before?: Record<string, unknown> | null,
    after?: Record<string, unknown> | null,
  ): Record<string, { before: unknown; after: unknown }> | null {
    if (!before || !after) return null;

    const diff: Record<string, { before: unknown; after: unknown }> = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        diff[key] = {
          before: before[key] ?? null,
          after: after[key] ?? null,
        };
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }
}
