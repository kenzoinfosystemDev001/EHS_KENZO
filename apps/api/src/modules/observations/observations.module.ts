import { Module } from "@nestjs/common";
import { ObservationsService } from "./observations.service";
import { ObservationsController } from "./observations.controller";
import { DatabaseModule } from "../../database/database.module";
import { AuditModule } from "../audit/audit.module";
import { OutboxModule } from "../outbox/outbox.module";
import { MediaModule } from "../media/media.module";

@Module({
  imports: [DatabaseModule, AuditModule, OutboxModule, MediaModule],
  controllers: [ObservationsController],
  providers: [ObservationsService],
  exports: [ObservationsService],
})
export class ObservationsModule {}
