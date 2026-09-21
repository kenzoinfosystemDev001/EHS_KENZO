import { OutboxService } from "./outbox.service";
import { PrismaService } from "../../database/prisma.service";

describe("OutboxService", () => {
  let service: OutboxService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      outboxEvent: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: "evt-1", ...data, createdAt: new Date() }),
        ),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    service = new OutboxService(mockPrisma as PrismaService);
  });

  describe("emit", () => {
    it("should stage event in outboxEvent table", async () => {
      const event = await service.emit({
        organizationId: "org-1",
        aggregateType: "INCIDENT",
        aggregateId: "inc-100",
        eventType: "INCIDENT_CREATED",
        payload: { title: "Spill" },
      });

      expect(event.id).toBe("evt-1");
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalled();
    });

    it("should deduplicate if idempotencyKey already exists", async () => {
      mockPrisma.outboxEvent.findFirst.mockResolvedValueOnce({
        id: "existing-evt",
        eventType: "INCIDENT_CREATED",
      });

      const event = await service.emit({
        organizationId: "org-1",
        aggregateType: "INCIDENT",
        aggregateId: "inc-100",
        eventType: "INCIDENT_CREATED",
        payload: { title: "Spill" },
        headers: { idempotencyKey: "unique-key-1" },
      });

      expect(event.id).toBe("existing-evt");
      expect(mockPrisma.outboxEvent.create).not.toHaveBeenCalled();
    });
  });

  describe("processPendingEvents", () => {
    it("should dispatch events to registered handlers and mark processedAt", async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      service.registerHandler("INCIDENT_CREATED", mockHandler);

      mockPrisma.outboxEvent.findMany.mockResolvedValueOnce([
        {
          id: "evt-1",
          eventType: "INCIDENT_CREATED",
          retryCount: 0,
          createdAt: new Date(),
        },
      ]);

      const count = await service.processPendingEvents(10);

      expect(count).toBe(1);
      expect(mockHandler).toHaveBeenCalled();
      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: "evt-1" },
        data: { processedAt: expect.any(Date), lastError: null },
      });
    });

    it("should increment retryCount on handler failure", async () => {
      const failingHandler = jest.fn().mockRejectedValue(new Error("Network timeout"));
      service.registerHandler("INCIDENT_CREATED", failingHandler);

      mockPrisma.outboxEvent.findMany.mockResolvedValueOnce([
        {
          id: "evt-1",
          eventType: "INCIDENT_CREATED",
          retryCount: 0,
          createdAt: new Date(),
        },
      ]);

      await service.processPendingEvents(10);

      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: "evt-1" },
        data: {
          retryCount: 1,
          lastError: "Network timeout",
        },
      });
    });
  });
});
