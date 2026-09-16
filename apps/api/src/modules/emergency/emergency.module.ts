import { Module } from "@nestjs/common";
import { EmergencyService } from "./emergency.service";
import { EmergencyController } from "./emergency.controller";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [EmergencyController],
  providers: [EmergencyService],
  exports: [EmergencyService],
})
export class EmergencyModule {}
