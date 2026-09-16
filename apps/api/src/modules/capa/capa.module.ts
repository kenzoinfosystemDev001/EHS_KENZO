import { Module } from '@nestjs/common';
import { CapaController } from './capa.controller';
import { CapaService } from './capa.service';
import { AuditModule } from '../audit/audit.module';
import { OutboxModule } from '../outbox/outbox.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [AuditModule, OutboxModule, WorkflowModule],
  controllers: [CapaController],
  providers: [CapaService],
  exports: [CapaService],
})
export class CapaModule {}
