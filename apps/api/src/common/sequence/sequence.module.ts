import { Global, Module } from "@nestjs/common";
import { SequenceAllocatorService } from "./sequence-allocator.service";

@Global()
@Module({
  providers: [SequenceAllocatorService],
  exports: [SequenceAllocatorService],
})
export class SequenceModule {}
