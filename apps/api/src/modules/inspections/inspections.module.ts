import { Module } from "@nestjs/common";
import { InspectionsService } from "./inspections.service";
import { InspectionsController } from "./inspections.controller";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [InspectionsController],
  providers: [InspectionsService],
  exports: [InspectionsService],
})
export class InspectionsModule {}
