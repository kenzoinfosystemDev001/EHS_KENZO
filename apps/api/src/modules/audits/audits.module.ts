import { Module } from "@nestjs/common";
import { AuditsService } from "./audits.service";
import { AuditsController } from "./audits.controller";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [AuditsController],
  providers: [AuditsService],
  exports: [AuditsService],
})
export class AuditsModule {}
