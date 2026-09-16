export enum WorkflowStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export enum WorkflowTaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  DELEGATED = "DELEGATED",
  ESCALATED = "ESCALATED",
}

export interface WorkflowTransitionContext {
  entityType: string;
  entityId: string;
  fromState: string;
  toState: string;
  action: string;
  actorId: string;
  actorRole: string;
  comments?: string;
  payload?: Record<string, unknown>;
}
