import { Module } from "@nestjs/common";
import { ActionsService } from "./actions.service";
import { ActionsController } from "./actions.controller";
import { DatabaseModule } from "../../database/database.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [ActionsController],
  providers: [ActionsService],
  exports: [ActionsService],
})
export class ActionsModule {}
