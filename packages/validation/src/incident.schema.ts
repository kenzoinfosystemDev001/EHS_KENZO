import { z } from 'zod';
import { IncidentClassificationType, IncidentSeverity } from '@kenzo-ehs/types';

export const CreateIncidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Detailed description must be at least 10 characters'),
  plantId: z.string().uuid('Invalid Plant UUID'),
  departmentId: z.string().uuid('Invalid Department UUID'),
  areaId: z.string().uuid('Invalid Area UUID').optional(),
  occurredAt: z.string().datetime({ message: 'Occurred timestamp must be ISO 8601' }),
  classification: z.nativeEnum(IncidentClassificationType),
  initialSeverity: z.nativeEnum(IncidentSeverity),
  immediateActionsTaken: z.string().optional(),
});

export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;

export const WorkflowActionSchema = z.object({
  action: z.string().min(1, 'Action name is required'),
  comments: z.string().min(3, 'Comments are required for audit justification'),
  payload: z.record(z.unknown()).optional(),
});

export type WorkflowActionInput = z.infer<typeof WorkflowActionSchema>;
