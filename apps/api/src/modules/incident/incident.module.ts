import { Module } from '@nestjs/common';
import { IncidentController } from './incident.controller';
import { IncidentService } from './incident.service';
import { AuditModule } from '../audit/audit.module';
import { OutboxModule } from '../outbox/outbox.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [AuditModule, OutboxModule, WorkflowModule],
  controllers: [IncidentController],
  providers: [IncidentService],
  exports: [IncidentService],
})
export class IncidentModule {}
