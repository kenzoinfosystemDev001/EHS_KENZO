import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { AuthenticatedUserContext } from "../../modules/auth/interfaces/auth.interface";

export interface SeparationOfDutiesContext {
  entityType: string;
  action: string;
  actor: AuthenticatedUserContext;
  record: {
    id: string;
    createdById?: string | null;
    authorId?: string | null;
    observerId?: string | null;
    ownerId?: string | null;
    assigneeId?: string | null;
    verifierId?: string | null;
    leadInvestigatorId?: string | null;
    requesterId?: string | null;
    receiverId?: string | null;
    [key: string]: any;
  };
}

@Injectable()
export class SeparationOfDutiesPolicy {
  private readonly logger = new Logger(SeparationOfDutiesPolicy.name);

  /**
   * Enforces regulatory separation of duties invariants.
   * Throws ForbiddenException if any segregation invariant is violated.
   */
  assertSeparationOfDuties(ctx: SeparationOfDutiesContext): void {
    const { entityType, action, actor, record } = ctx;
    const actorId = actor.id;

    // Invariant 1: PROHIBIT_SELF_APPROVAL
    // The creator/author of a record cannot approve or verify their own record.
    const approvalActions = [
      "APPROVE",
      "APPROVE_CLOSURE",
      "VERIFY",
      "ADMIN_APPROVE_AND_SCHEDULE",
      "CLOSE",
    ];

    if (approvalActions.includes(action.toUpperCase())) {
      const creatorId =
        record.createdById || record.authorId || record.observerId;

      if (creatorId && creatorId === actorId) {
        this.logger.warn(
          `SeparationOfDuties Violation: Actor ${actor.email} (${actorId}) attempted to '${action}' ${entityType} (${record.id}) which they created.`,
        );
        throw new ForbiddenException(
          `Separation of Duties Violation: You cannot approve or verify a record you created. An independent reviewer is required.`,
        );
      }
    }

    // Invariant 2: PROHIBIT_DUAL_ROLE (CAPA / Action Items)
    // The designated owner/assignee cannot verify their own corrective action.
    if (action.toUpperCase() === "VERIFY") {
      const ownerId = record.ownerId || record.assigneeId;
      if (ownerId && ownerId === actorId) {
        this.logger.warn(
          `SeparationOfDuties Violation: CAPA/Action Owner ${actor.email} (${actorId}) attempted to verify their own assignment on ${entityType} (${record.id}).`,
        );
        throw new ForbiddenException(
          `Separation of Duties Violation: The assigned action owner cannot act as the verifier. Independent verification is required by regulatory mandate.`,
        );
      }
    }

    // Invariant 3: PROHIBIT_INVESTIGATOR_APPROVER (Incident Management)
    // The lead investigator cannot approve final closure of the incident.
    if (
      entityType.toUpperCase() === "INCIDENT" &&
      (action.toUpperCase() === "APPROVE_CLOSURE" ||
        action.toUpperCase() === "CLOSE")
    ) {
      if (record.leadInvestigatorId && record.leadInvestigatorId === actorId) {
        this.logger.warn(
          `SeparationOfDuties Violation: Lead Investigator ${actor.email} attempted to approve closure for Incident ${record.id}.`,
        );
        throw new ForbiddenException(
          `Separation of Duties Violation: The lead investigator cannot approve final closure. Closure approval must be performed by Plant Head or Corporate HSE.`,
        );
      }
    }

    // Invariant 4: PROHIBIT_PERMIT_RECEIVER_ISSUER (Permit to Work - PTW)
    // The permit requester or permit receiver cannot issue or approve the permit.
    if (
      entityType.toUpperCase() === "PTW" &&
      (action.toUpperCase() === "ISSUE" ||
        action.toUpperCase() === "SAFETY_APPROVE" ||
        action.toUpperCase() === "APPROVE")
    ) {
      if (
        (record.requesterId && record.requesterId === actorId) ||
        (record.receiverId && record.receiverId === actorId)
      ) {
        this.logger.warn(
          `SeparationOfDuties Violation: Permit requester/receiver ${actor.email} attempted to issue/approve PTW ${record.id}.`,
        );
        throw new ForbiddenException(
          `Separation of Duties Violation: A permit receiver or requester cannot issue or approve their own permit to work.`,
        );
      }
    }
  }
}
