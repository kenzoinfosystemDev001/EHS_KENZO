import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@prisma/client";

export interface CreateVersionParams {
  entityType: string;
  entityId: string;
  snapshot: Record<string, unknown>;
  actorId: string;
  reason?: string;
  tx?: Prisma.TransactionClient;
}

@Injectable()
export class VersioningService {
  private readonly logger = new Logger(VersioningService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Captures an immutable snapshot of an entity before or after a critical mutation.
   */
  async createSnapshot(params: CreateVersionParams) {
    const client = params.tx || this.prisma;

    // Find current latest version
    const latest = await client.entityVersion.findFirst({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
      },
      orderBy: { version: "desc" },
    });

    const nextVersion = (latest?.version ?? 0) + 1;

    const versionRecord = await client.entityVersion.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        version: nextVersion,
        snapshot: params.snapshot as Prisma.InputJsonValue,
        actorId: params.actorId,
        reason: params.reason ?? null,
      },
    });

    this.logger.debug(
      `Snapshot captured: ${params.entityType}[${params.entityId}] version ${nextVersion} by ${params.actorId}`,
    );

    return versionRecord;
  }

  /**
   * Retrieves all historical versions for a regulated entity.
   */
  async getVersions(entityType: string, entityId: string) {
    return this.prisma.entityVersion.findMany({
      where: { entityType, entityId },
      orderBy: { version: "desc" },
    });
  }

  /**
   * Retrieves a specific historical snapshot.
   */
  async getVersion(entityType: string, entityId: string, version: number) {
    const record = await this.prisma.entityVersion.findUnique({
      where: {
        entityType_entityId_version: {
          entityType,
          entityId,
          version,
        },
      },
    });

    if (!record) {
      throw new NotFoundException(
        `Version ${version} of ${entityType} [${entityId}] not found`,
      );
    }

    return record;
  }
}
