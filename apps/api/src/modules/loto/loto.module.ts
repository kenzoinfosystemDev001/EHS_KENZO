import { Module } from "@nestjs/common";
import { LotoService } from "./loto.service";
import { LotoController } from "./loto.controller";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [LotoController],
  providers: [LotoService],
  exports: [LotoService],
})
export class LotoModule {}
