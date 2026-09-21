import { assertOptimisticLock } from "./optimistic-lock";
import { ConflictException } from "@nestjs/common";

describe("assertOptimisticLock", () => {
  it("should succeed when versions match", () => {
    expect(() => {
      assertOptimisticLock({ version: 2 }, 2);
    }).not.toThrow();
  });

  it("should throw ConflictException when versions differ", () => {
    expect(() => {
      assertOptimisticLock({ version: 3 }, 2);
    }).toThrow(ConflictException);
  });

  it("should succeed when timestamps are within margin of tolerance", () => {
    const now = new Date();
    expect(() => {
      assertOptimisticLock({ updatedAt: now }, undefined, now.toISOString());
    }).not.toThrow();
  });

  it("should throw ConflictException when timestamps differ significantly", () => {
    const recordTime = new Date("2026-09-21T10:00:00Z");
    const clientTime = new Date("2026-09-21T09:00:00Z");
    expect(() => {
      assertOptimisticLock(
        { updatedAt: recordTime },
        undefined,
        clientTime.toISOString(),
      );
    }).toThrow(ConflictException);
  });
});
