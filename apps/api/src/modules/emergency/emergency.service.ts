import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUserContext } from "../auth/interfaces/auth.interface";

@Injectable()
export class EmergencyService {
  constructor(private readonly prisma: PrismaService) {}

  async getDrills(user: AuthenticatedUserContext) {
    return this.prisma.emergencyDrill.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { conductedDate: "desc" },
    });
  }

  async logDrill(dto: any, user: AuthenticatedUserContext) {
    let plantId = dto.plantId;
    if (!plantId) {
      const plant = await this.prisma.plant.findFirst({ where: { organizationId: user.organizationId } });
      plantId = plant?.id || "PLANT-DEFAULT";
    }

    return this.prisma.emergencyDrill.create({
      data: {
        organizationId: user.organizationId,
        plantId,
        drillType: dto.drillType || "FIRE_EVACUATION",
        conductedDate: new Date(dto.conductedDate || Date.now()),
        durationMinutes: dto.durationMinutes ? Number(dto.durationMinutes) : 25,
        participantsCount: dto.participantsCount ? Number(dto.participantsCount) : 48,
        evacuationScore: dto.evacuationScore ? Number(dto.evacuationScore) : 95.0,
        strengths: dto.strengths || dto.description || "All personnel reached assembly area safely",
        improvements: dto.improvements || "Continue quarterly drill schedule",
      },
    });
  }

  async getContacts(user: AuthenticatedUserContext) {
    return this.prisma.emergencyContact.findMany({
      where: { plant: { organizationId: user.organizationId } },
      orderBy: { priorityOrder: "asc" },
    });
  }

  async createContact(dto: any, _user: AuthenticatedUserContext) {
    return this.prisma.emergencyContact.create({ data: dto });
  }

  // ==========================================
  // EMERGENCY SOS BROADCAST ENGINE
  // ==========================================
  private activeSosAlerts: Map<string, any> = new Map();

  async triggerSos(dto: {
    emergencyType: string;
    plantId?: string;
    location?: string;
    message?: string;
  }, user: AuthenticatedUserContext) {
    const alertId = `SOS-${Date.now()}`;
    const plant = dto.plantId
      ? await this.prisma.plant.findFirst({
          where: { id: dto.plantId, organizationId: user.organizationId },
        })
      : null;

    const alert = {
      id: alertId,
      organizationId: user.organizationId,
      plantId: plant?.id || dto.plantId || null,
      plantName: plant?.name || "All Facilities",
      emergencyType: dto.emergencyType || "GENERAL_EMERGENCY",
      location: dto.location || "Facility Wide",
      message: dto.message || "EVACUATE OR PROCEED TO ASSEMBLY AREA IMMEDIATELY",
      triggeredBy: user.email,
      triggeredByName: `${user.firstName} ${user.lastName}`,
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.activeSosAlerts.set(alertId, alert);

    // Broadcast urgent notifications to all users in the organization
    try {
      const allUsers = await this.prisma.user.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true },
      });

      await this.prisma.notification.createMany({
        data: allUsers.map((u) => ({
          userId: u.id,
          title: `🚨 EMERGENCY SOS: ${alert.emergencyType}`,
          message: `${alert.message} (Location: ${alert.location}) - Triggered by ${alert.triggeredByName}`,
          priority: "CRITICAL" as any,
          channel: "IN_APP" as any,
          entityType: "EMERGENCY_SOS",
          entityId: alertId,
        })),
      });
    } catch (err) {
      // Non-blocking notification dispatch
    }

    return alert;
  }

  async getActiveSos(user: AuthenticatedUserContext) {
    const alerts: any[] = [];
    const cutoff = Date.now() - 2 * 3600000; // 2 hours

    for (const alert of this.activeSosAlerts.values()) {
      if (
        alert.organizationId === user.organizationId &&
        alert.active &&
        new Date(alert.createdAt).getTime() > cutoff
      ) {
        alerts.push(alert);
      }
    }

    return alerts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async silenceSos(id: string, user: AuthenticatedUserContext) {
    const alert = this.activeSosAlerts.get(id);
    if (alert && alert.organizationId === user.organizationId) {
      alert.active = false;
      alert.silencedBy = user.email;
      alert.silencedAt = new Date().toISOString();
      this.activeSosAlerts.set(id, alert);
      return { success: true, alert };
    }
    return { success: false, message: "Alert not found or already silenced" };
  }
}
