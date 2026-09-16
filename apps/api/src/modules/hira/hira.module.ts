import { Module } from '@nestjs/common';
import { HiraService } from './hira.service';
import { HiraController } from './hira.controller';

@Module({
  controllers: [HiraController],
  providers: [HiraService],
  exports: [HiraService],
})
export class HiraModule {}
