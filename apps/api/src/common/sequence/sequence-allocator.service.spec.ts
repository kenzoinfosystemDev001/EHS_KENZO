import { SequenceAllocatorService } from "./sequence-allocator.service";
import { PrismaService } from "../../database/prisma.service";

describe("SequenceAllocatorService", () => {
  let service: SequenceAllocatorService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      entitySequence: {
        upsert: jest.fn().mockResolvedValue({
          id: "seq-1",
          organizationId: "org-1",
          entityType: "INCIDENT",
          prefix: "INC-2026-PLANT1",
          lastValue: 42,
        }),
      },
    };
    service = new SequenceAllocatorService(mockPrisma as PrismaService);
  });

  it("should format reference number with zero padding correctly", async () => {
    const ref = await service.nextReferenceNumber(
      "org-1",
      "INCIDENT",
      "INC-2026-PLANT1",
      4,
    );

    expect(ref).toBe("INC-2026-PLANT1-0042");
    expect(mockPrisma.entitySequence.upsert).toHaveBeenCalledWith({
      where: {
        organizationId_entityType_prefix: {
          organizationId: "org-1",
          entityType: "INCIDENT",
          prefix: "INC-2026-PLANT1",
        },
      },
      update: {
        lastValue: { increment: 1 },
      },
      create: {
        organizationId: "org-1",
        entityType: "INCIDENT",
        prefix: "INC-2026-PLANT1",
        lastValue: 1,
      },
    });
  });

  it("should use transaction client when provided", async () => {
    const mockTx: any = {
      entitySequence: {
        upsert: jest.fn().mockResolvedValue({
          id: "seq-2",
          organizationId: "org-1",
          entityType: "CAPA",
          prefix: "CAPA-2026",
          lastValue: 1,
        }),
      },
    };

    const ref = await service.nextReferenceNumber(
      "org-1",
      "CAPA",
      "CAPA-2026",
      4,
      mockTx,
    );

    expect(ref).toBe("CAPA-2026-0001");
    expect(mockTx.entitySequence.upsert).toHaveBeenCalled();
    expect(mockPrisma.entitySequence.upsert).not.toHaveBeenCalled();
  });
});
