import { Module } from '@nestjs/common';
import { RcaController } from './rca.controller';
import { RcaService } from './rca.service';
import { AuditModule } from '../audit/audit.module';
import { OutboxModule } from '../outbox/outbox.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [AuditModule, OutboxModule, WorkflowModule],
  controllers: [RcaController],
  providers: [RcaService],
  exports: [RcaService],
})
export class RcaModule {}
