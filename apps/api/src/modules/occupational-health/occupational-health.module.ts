import { Module } from "@nestjs/common";
import { OccupationalHealthService } from "./occupational-health.service";
import { OccupationalHealthController } from "./occupational-health.controller";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [OccupationalHealthController],
  providers: [OccupationalHealthService],
  exports: [OccupationalHealthService],
})
export class OccupationalHealthModule {}
