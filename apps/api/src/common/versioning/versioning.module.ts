import { Global, Module } from "@nestjs/common";
import { VersioningService } from "./versioning.service";

@Global()
@Module({
  providers: [VersioningService],
  exports: [VersioningService],
})
export class VersioningModule {}
