export enum HiraStudyStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  TEAM_REVIEW = 'TEAM_REVIEW',
  APPROVAL_PENDING = 'APPROVAL_PENDING',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum HiraEntryStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  PENDING_REAPPROVAL = 'PENDING_REAPPROVAL',
  REJECTED = 'REJECTED',
}

export enum RiskLevel {
  LOW = 'LOW', // Broadly acceptable
  MODERATE = 'MODERATE', // Tolerable if ALARP
  HIGH = 'HIGH', // Tolerable with explicit justification
  CRITICAL = 'CRITICAL', // Unacceptable - requires risk reduction or override
}

export enum ControlHierarchyType {
  ELIMINATION = 'ELIMINATION',
  SUBSTITUTION = 'SUBSTITUTION',
  ENGINEERING = 'ENGINEERING',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  PPE = 'PPE',
}
