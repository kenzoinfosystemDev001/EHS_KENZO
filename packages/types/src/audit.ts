export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SUBMIT = 'SUBMIT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  OVERRIDE = 'OVERRIDE',
  VERIFY = 'VERIFY',
  CLOSE = 'CLOSE',
  ACTIVATE = 'ACTIVATE',
  ARCHIVE = 'ARCHIVE',
}

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  actorId: string;
  actorEmail?: string;
  plantId?: string;
  organizationId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: Date | string;
}

export interface OutboxEventEntry {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: Date | string;
  processedAt?: Date | string | null;
}
