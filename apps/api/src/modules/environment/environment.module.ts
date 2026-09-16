import { Module } from "@nestjs/common";
import { EnvironmentService } from "./environment.service";
import { EnvironmentController } from "./environment.controller";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [EnvironmentController],
  providers: [EnvironmentService],
  exports: [EnvironmentService],
})
export class EnvironmentModule {}
