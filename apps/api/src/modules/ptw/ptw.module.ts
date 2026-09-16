import { Module } from "@nestjs/common";
import { PtwController } from "./ptw.controller";
import { PtwService } from "./ptw.service";
import { AuditModule } from "../audit/audit.module";
import { OutboxModule } from "../outbox/outbox.module";
import { WorkflowModule } from "../workflow/workflow.module";

@Module({
  imports: [AuditModule, OutboxModule, WorkflowModule],
  controllers: [PtwController],
  providers: [PtwService],
  exports: [PtwService],
})
export class PtwModule {}
