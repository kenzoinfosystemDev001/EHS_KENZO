import { SeparationOfDutiesPolicy } from "./separation-of-duties.policy";
import { ForbiddenException } from "@nestjs/common";
import { AuthenticatedUserContext } from "../../modules/auth/interfaces/auth.interface";
import { AccessScope } from "@kenzo-ehs/types";

describe("SeparationOfDutiesPolicy", () => {
  let policy: SeparationOfDutiesPolicy;

  const mockActor: AuthenticatedUserContext = {
    id: "user-123",
    email: "user@test.com",
    firstName: "Test",
    lastName: "User",
    organizationId: "org-1",
    sessionId: "sess-1",
    roles: ["SUPERVISOR"],
    permissions: ["HIRA.APPROVE"],
    roleScopes: [
      {
        roleCode: "SUPERVISOR",
        scope: AccessScope.OWN_PLANT,
        plantId: "plant-1",
      },
    ],
  };

  beforeEach(() => {
    policy = new SeparationOfDutiesPolicy();
  });

  describe("PROHIBIT_SELF_APPROVAL", () => {
    it("should throw ForbiddenException if creator attempts to approve their own record", () => {
      expect(() => {
        policy.assertSeparationOfDuties({
          entityType: "HiraStudy",
          action: "APPROVE",
          actor: mockActor,
          record: {
            id: "study-1",
            createdById: "user-123",
          },
        });
      }).toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException if observer attempts to verify their own observation", () => {
      expect(() => {
        policy.assertSeparationOfDuties({
          entityType: "SafetyObservation",
          action: "VERIFY",
          actor: mockActor,
          record: {
            id: "obs-1",
            observerId: "user-123",
          },
        });
      }).toThrow(ForbiddenException);
    });

    it("should allow an independent reviewer to approve", () => {
      expect(() => {
        policy.assertSeparationOfDuties({
          entityType: "HiraStudy",
          action: "APPROVE",
          actor: mockActor,
          record: {
            id: "study-1",
            createdById: "different-user-456",
          },
        });
      }).not.toThrow();
    });
  });

  describe("PROHIBIT_DUAL_ROLE (CAPA / Action)", () => {
    it("should throw ForbiddenException if action owner attempts to verify the CAPA", () => {
      expect(() => {
        policy.assertSeparationOfDuties({
          entityType: "CapaRecord",
          action: "VERIFY",
          actor: mockActor,
          record: {
            id: "capa-1",
            ownerId: "user-123",
          },
        });
      }).toThrow(ForbiddenException);
    });

    it("should allow an independent verifier to verify CAPA", () => {
      expect(() => {
        policy.assertSeparationOfDuties({
          entityType: "CapaRecord",
          action: "VERIFY",
          actor: mockActor,
          record: {
            id: "capa-1",
            ownerId: "different-user-456",
          },
        });
      }).not.toThrow();
    });
  });

  describe("PROHIBIT_INVESTIGATOR_APPROVER", () => {
    it("should throw ForbiddenException if lead investigator attempts to approve closure of incident", () => {
      expect(() => {
        policy.assertSeparationOfDuties({
          entityType: "Incident",
          action: "APPROVE_CLOSURE",
          actor: mockActor,
          record: {
            id: "inc-1",
            leadInvestigatorId: "user-123",
          },
        });
      }).toThrow(ForbiddenException);
    });
  });

  describe("PROHIBIT_PERMIT_RECEIVER_ISSUER", () => {
    it("should throw ForbiddenException if requester attempts to approve/issue permit", () => {
      expect(() => {
        policy.assertSeparationOfDuties({
          entityType: "PTW",
          action: "APPROVE",
          actor: mockActor,
          record: {
            id: "ptw-1",
            requesterId: "user-123",
          },
        });
      }).toThrow(ForbiddenException);
    });
  });
});
