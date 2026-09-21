import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class SequenceAllocatorService {
  private readonly logger = new Logger(SequenceAllocatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Concurrency-safe atomic reference number generator.
   * Eliminates all race-prone `count + 1` logic.
   *
   * @param organizationId - Tenant isolation boundary
   * @param entityType - Domain entity type (e.g. OBSERVATION, INCIDENT, PTW, CAPA, HIRA, ACTION, AUDIT)
   * @param prefix - Reference number prefix (e.g. OBS-2026, INC-2026-PLANT-NW)
   * @param padding - Zero padding digits (default: 4 -> 0001)
   * @param tx - Optional transaction client (ensures rollback on transaction abort)
   * @returns Formatted reference number, e.g. "OBS-2026-0001"
   */
  async nextReferenceNumber(
    organizationId: string,
    entityType: string,
    prefix: string,
    padding: number = 4,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client: any = tx || this.prisma;

    const sequence = await client.entitySequence.upsert({
      where: {
        organizationId_entityType_prefix: {
          organizationId,
          entityType,
          prefix,
        },
      },
      update: {
        lastValue: { increment: 1 },
      },
      create: {
        organizationId,
        entityType,
        prefix,
        lastValue: 1,
      },
    });

    const formattedSeq = String(sequence.lastValue).padStart(padding, "0");
    const referenceNumber = `${prefix}-${formattedSeq}`;

    this.logger.debug(
      `Allocated atomic reference number [${referenceNumber}] for ${entityType} in Org ${organizationId}`,
    );

    return referenceNumber;
  }
}
