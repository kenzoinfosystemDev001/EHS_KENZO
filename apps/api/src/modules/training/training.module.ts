import { Module } from "@nestjs/common";
import { TrainingService } from "./training.service";
import { TrainingController } from "./training.controller";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
