import { z } from "zod";
import { ControlHierarchyType, RiskLevel } from "@kenzo-ehs/types";

export const CreateHiraStudySchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  plantId: z.string().uuid("Invalid Plant UUID"),
  departmentId: z.string().uuid("Invalid Department UUID"),
  areaId: z.string().uuid("Invalid Area UUID").optional(),
  leaderId: z.string().uuid("Invalid Leader User UUID"),
  teamMemberIds: z
    .array(z.string().uuid("Invalid Team Member User UUID"))
    .min(1, "At least one team member is required"),
});

export type CreateHiraStudyInput = z.infer<typeof CreateHiraStudySchema>;

export const AddHiraEntrySchema = z.object({
  activity: z.string().min(3, "Activity description is required"),
  hazard: z.string().min(3, "Hazard description is required"),
  initialSeverity: z.number().int().min(1).max(5),
  initialLikelihood: z.number().int().min(1).max(5),
  existingControls: z.array(
    z.object({
      type: z.nativeEnum(ControlHierarchyType),
      description: z.string().min(2),
      effectivenessPercent: z.number().min(0).max(100),
    }),
  ),
  residualRiskLevel: z.nativeEnum(RiskLevel),
  alarpJustification: z.string().optional(),
});

export type AddHiraEntryInput = z.infer<typeof AddHiraEntrySchema>;
