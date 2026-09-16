import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Platform Health and Liveness probe' })
  check() {
    return {
      status: 'ok',
      service: 'kenzo-ehs-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
