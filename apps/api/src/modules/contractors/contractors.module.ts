import { Module } from "@nestjs/common";
import { ContractorsService } from "./contractors.service";
import { ContractorsController } from "./contractors.controller";
import { DatabaseModule } from "../../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [ContractorsController],
  providers: [ContractorsService],
  exports: [ContractorsService],
})
export class ContractorsModule {}
