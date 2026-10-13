import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly health: HealthIndicatorService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.health.check(key);
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return indicator.up();
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message.trim() : 'unreachable';
      const cleanMessage = rawMessage.replace(/^Invalid `prisma\.\$queryRaw\(\)` invocation:\s*/, '').trim();
      return indicator.down({ message: cleanMessage || 'Database connection refused or unreachable' });
    }
  }
}
