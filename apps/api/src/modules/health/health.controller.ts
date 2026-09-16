import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Platform Liveness probe' })
  check() {
    return {
      status: 'ok',
      service: 'kenzo-ehs-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Platform Readiness probe (verifies database connectivity)' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        service: 'kenzo-ehs-api',
        checks: {
          database: 'healthy',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown database error';
      throw new ServiceUnavailableException({
        status: 'unavailable',
        checks: {
          database: 'unhealthy',
        },
        error: errorMsg,
      });
    }
  }
}
