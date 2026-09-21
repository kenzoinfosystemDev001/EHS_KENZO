import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { OutboxService } from "../outbox/outbox.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationPriority, OutboxEvent } from "@prisma/client";

@Injectable()
export class EventSubscribersService implements OnModuleInit {
  private readonly logger = new Logger(EventSubscribersService.name);

  constructor(
    private readonly outboxService: OutboxService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.registerHiraSubscribers();
    this.registerIncidentSubscribers();
    this.registerCapaSubscribers();
    this.registerPtwSubscribers();
    this.registerObservationSubscribers();
    this.logger.log("All EHS domain event subscribers registered successfully.");
  }

  // ==========================================
  // 1. HIRA DOMAIN EVENTS
  // ==========================================
  private registerHiraSubscribers() {
    this.outboxService.registerHandler("HIRA_SUBMIT", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] HIRA_SUBMITTED: Study ${payload.studyId}`);
    });

    this.outboxService.registerHandler("HIRA_RECOMMEND", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] HIRA_REVIEWED: Study ${payload.studyId} recommended for approval`);
    });

    this.outboxService.registerHandler("HIRA_APPROVE", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] HIRA_APPROVED: Study ${payload.studyId} approved`);
    });

    this.outboxService.registerHandler("HIRA_ACTIVATE", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] HIRA_ACTIVATED: Study ${payload.studyId} active`);
    });
  }

  // ==========================================
  // 2. INCIDENT DOMAIN EVENTS
  // ==========================================
  private registerIncidentSubscribers() {
    this.outboxService.registerHandler("INCIDENT_CREATED", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] INCIDENT_CREATED: Incident ${payload.incidentId} (${payload.referenceNumber})`);
    });

    this.outboxService.registerHandler("INCIDENT_START_INVESTIGATION", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] INCIDENT_INVESTIGATION_STARTED: Incident ${payload.incidentId}`);
    });

    this.outboxService.registerHandler("INCIDENT_LINK_CAPA", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] INCIDENT_RCA_COMPLETED: RCA & CAPA linked to Incident ${payload.incidentId}`);
    });

    this.outboxService.registerHandler("INCIDENT_APPROVE_CLOSURE", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] INCIDENT_CLOSED: Incident ${payload.incidentId} closed`);
    });
  }

  // ==========================================
  // 3. CAPA DOMAIN EVENTS
  // ==========================================
  private registerCapaSubscribers() {
    this.outboxService.registerHandler("CAPA_CREATED", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] CAPA_CREATED: Record ${payload.capaId}`);
    });

    this.outboxService.registerHandler("CAPA_ASSIGN", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] CAPA_ASSIGNED: Record ${payload.capaId} assigned to user`);
      if (payload.assignedToId) {
        await this.notificationsService.send({
          userId: payload.assignedToId,
          title: "New CAPA Assigned",
          message: `You have been assigned as the owner for CAPA action.`,
          priority: NotificationPriority.HIGH,
          entityType: "CapaRecord",
          entityId: payload.capaId,
        });
      }
    });

    this.outboxService.registerHandler("CAPA_SUBMIT_VERIFICATION", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] CAPA_VERIFICATION_REQUESTED: Record ${payload.capaId}`);
    });

    this.outboxService.registerHandler("CAPA_VERIFY", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] CAPA_VERIFIED: Record ${payload.capaId} verified`);
    });

    this.outboxService.registerHandler("CAPA_CLOSE", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] CAPA_CLOSED: Record ${payload.capaId} closed`);
    });
  }

  // ==========================================
  // 4. PTW (PERMIT TO WORK) DOMAIN EVENTS
  // ==========================================
  private registerPtwSubscribers() {
    this.outboxService.registerHandler("PTW_CREATED", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] PTW_CREATED: Permit ${payload.ptwId}`);
    });

    this.outboxService.registerHandler("PTW_APPROVE", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] PTW_APPROVED: Permit ${payload.ptwId} approved`);
    });

    this.outboxService.registerHandler("PTW_ACTIVATE", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] PTW_ACTIVATED: Permit ${payload.ptwId} activated`);
    });

    this.outboxService.registerHandler("PTW_CLOSE", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] PTW_CLOSED: Permit ${payload.ptwId} closed`);
    });
  }

  // ==========================================
  // 5. SAFETY OBSERVATION DOMAIN EVENTS
  // ==========================================
  private registerObservationSubscribers() {
    this.outboxService.registerHandler("OBSERVATION_REPORTED", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] OBSERVATION_REPORTED: Observation ${payload.observationId}`);
    });

    this.outboxService.registerHandler("OBSERVATION_VERIFIED", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] OBSERVATION_VERIFIED: Observation ${payload.observationId}`);
    });

    this.outboxService.registerHandler("OBSERVATION_CLOSED", async (event: OutboxEvent) => {
      const payload = event.payload as Record<string, any>;
      this.logger.log(`[DomainEvent] OBSERVATION_CLOSED: Observation ${payload.observationId}`);
    });
  }
}
