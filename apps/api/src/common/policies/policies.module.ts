import { Global, Module } from "@nestjs/common";
import { SeparationOfDutiesPolicy } from "./separation-of-duties.policy";

@Global()
@Module({
  providers: [SeparationOfDutiesPolicy],
  exports: [SeparationOfDutiesPolicy],
})
export class PoliciesModule {}
