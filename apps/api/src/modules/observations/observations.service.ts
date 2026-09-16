import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { OutboxService } from "../outbox/outbox.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";
import { ObservationStatus, ActionItemStatus, ActionSourceType, CapaPriority } from "@prisma/client";

const TX_CONFIG = { maxWait: 20000, timeout: 60000 };

@Injectable()
export class ObservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async create(dto: any, user: AuthenticatedUserContext) {
    return this.prisma.$transaction(async (tx) => {
      const refCount = await tx.safetyObservation.count({
        where: { organizationId: user.organizationId },
      });
      const seq = String(refCount + 1).padStart(4, "0");
      const referenceNumber = `OBS-2026-${seq}`;

      const obs = await tx.safetyObservation.create({
        data: {
          organizationId: user.organizationId,
          plantId: dto.plantId,
          departmentId: dto.departmentId || null,
          areaId: dto.areaId || null,
          referenceNumber,
          observationType: dto.observationType,
          severity: dto.severity || "LOW",
          description: dto.description,
          locationDetails: dto.locationDetails || null,
          immediateAction: dto.immediateAction || null,
          observerId: user.id,
          actionRequired: dto.actionRequired || false,
          status: ObservationStatus.REPORTED,
        },
      });

      await this.audit.log({
        organizationId: user.organizationId,
        plantId: obs.plantId,
        actorId: user.id,
        action: "OBSERVATION.CREATE",
        entityType: "SafetyObservation",
        entityId: obs.id,
        afterState: { status: obs.status, referenceNumber: obs.referenceNumber },
        reason: "Observation reported",
        tx,
      });

      await this.outbox.emit({
        organizationId: user.organizationId,
        aggregateType: "SAFETY_OBSERVATION",
        aggregateId: obs.id,
        eventType: "OBSERVATION_CREATED",
        payload: { id: obs.id, referenceNumber: obs.referenceNumber },
        tx,
      });

      return obs;
    }, TX_CONFIG);
  }

  async findAll(user: AuthenticatedUserContext) {
    return this.prisma.safetyObservation.findMany({
      where: { organizationId: user.organizationId },
      include: {
        observer: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string, user: AuthenticatedUserContext) {
    const obs = await this.prisma.safetyObservation.findUnique({
      where: { id },
      include: {
        observer: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        actions: true,
      },
    });
    if (!obs || obs.organizationId !== user.organizationId) {
      throw new NotFoundException("Observation not found");
    }
    return obs;
  }

  async review(id: string, dto: any, user: AuthenticatedUserContext) {
    return this.prisma.$transaction(async (tx) => {
      const obs = await tx.safetyObservation.update({
        where: { id },
        data: {
          status: ObservationStatus.REVIEWED,
          reviewerId: user.id,
          reviewedAt: new Date(),
        },
      });
      await this.audit.log({
        organizationId: user.organizationId,
        plantId: obs.plantId,
        actorId: user.id,
        action: "OBSERVATION.REVIEW",
        entityType: "SafetyObservation",
        entityId: obs.id,
        afterState: { status: obs.status },
        reason: dto.comments || "Reviewed",
        tx,
      });
      return obs;
    }, TX_CONFIG);
  }

  async requireAction(id: string, user: AuthenticatedUserContext) {
    return this.prisma.$transaction(async (tx) => {
      const obs = await tx.safetyObservation.update({
        where: { id },
        data: {
          status: ObservationStatus.ACTION_REQUIRED,
          actionRequired: true,
        },
      });

      const actCount = await tx.actionItem.count({
        where: { organizationId: user.organizationId },
      });
      const seq = String(actCount + 1).padStart(4, "0");
      const referenceNumber = `ACT-2026-${seq}`;

      const action = await tx.actionItem.create({
        data: {
          organizationId: user.organizationId,
          plantId: obs.plantId,
          referenceNumber,
          title: `Action for observation ${obs.referenceNumber}`,
          description: obs.description,
          sourceType: ActionSourceType.OBSERVATION,
          sourceEntityId: obs.id,
          observationId: obs.id,
          status: ActionItemStatus.OPEN,
          priority: CapaPriority.HIGH,
          ownerId: user.id,
          targetDate: new Date(Date.now() + 7 * 24 * 3600000),
        },
      });

      await this.audit.log({
        organizationId: user.organizationId,
        plantId: obs.plantId,
        actorId: user.id,
        action: "OBSERVATION.REQUIRE_ACTION",
        entityType: "SafetyObservation",
        entityId: obs.id,
        afterState: { status: obs.status, actionId: action.id },
        reason: "Action assigned",
        tx,
      });

      return { obs, action };
    }, TX_CONFIG);
  }

  async verify(id: string, user: AuthenticatedUserContext) {
    return this.prisma.$transaction(async (tx) => {
      const obs = await tx.safetyObservation.update({
        where: { id },
        data: { status: ObservationStatus.VERIFIED },
      });
      await this.audit.log({
        organizationId: user.organizationId,
        plantId: obs.plantId,
        actorId: user.id,
        action: "OBSERVATION.VERIFY",
        entityType: "SafetyObservation",
        entityId: obs.id,
        afterState: { status: obs.status },
        reason: "Observation verified",
        tx,
      });
      return obs;
    }, TX_CONFIG);
  }

  async close(id: string, user: AuthenticatedUserContext) {
    return this.prisma.$transaction(async (tx) => {
      const obs = await tx.safetyObservation.update({
        where: { id },
        data: {
          status: ObservationStatus.CLOSED,
          closedAt: new Date(),
        },
      });
      await this.audit.log({
        organizationId: user.organizationId,
        plantId: obs.plantId,
        actorId: user.id,
        action: "OBSERVATION.CLOSE",
        entityType: "SafetyObservation",
        entityId: obs.id,
        afterState: { status: obs.status },
        reason: "Observation closed",
        tx,
      });
      return obs;
    }, TX_CONFIG);
  }
}
