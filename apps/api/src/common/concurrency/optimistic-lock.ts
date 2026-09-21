import { ConflictException } from "@nestjs/common";

export interface VersionedEntity {
  version?: number;
  updatedAt?: Date | string;
}

export function assertOptimisticLock(
  current: VersionedEntity,
  expectedVersion?: number,
  expectedUpdatedAt?: Date | string,
): void {
  if (expectedVersion !== undefined && current.version !== undefined) {
    if (current.version !== expectedVersion) {
      throw new ConflictException(
        `Optimistic lock conflict: Record version (${current.version}) does not match expected version (${expectedVersion}). The record was modified concurrently.`,
      );
    }
  }

  if (expectedUpdatedAt !== undefined && current.updatedAt !== undefined) {
    const currentTime = new Date(current.updatedAt).getTime();
    const expectedTime = new Date(expectedUpdatedAt).getTime();
    if (Math.abs(currentTime - expectedTime) > 1000) {
      throw new ConflictException(
        `Optimistic lock conflict: Record timestamp (${new Date(
          current.updatedAt,
        ).toISOString()}) differs from client timestamp (${new Date(
          expectedUpdatedAt,
        ).toISOString()}). The record was modified concurrently.`,
      );
    }
  }
}
