import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.provider';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async suspendInactiveUsers() {
    try {
      this.logger.log('Running scheduled job: suspendInactiveUsers');

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Find users in PENDING_PROFILE status who haven't submitted profile for 7 days
      const usersToSuspend = await this.prisma.user.findMany({
        where: {
          status: 'PENDING_PROFILE',
          OR: [
            { profileSubmittedAt: null },
            { profileSubmittedAt: { lt: sevenDaysAgo } },
          ],
        },
      });

      if (usersToSuspend.length === 0) {
        this.logger.log('No users to suspend');
        return;
      }

      const userIds = usersToSuspend.map((u) => u.id);

      await this.prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: { status: 'SUSPENDED' },
      });

      // Also revoke all refresh tokens for suspended users
      await this.prisma.refreshToken.updateMany({
        where: { userId: { in: userIds }, revoked: false },
        data: { revoked: true },
      });

      this.logger.log(
        `Suspended ${usersToSuspend.length} users for incomplete profile`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to suspend inactive users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // Additional scheduled job: clean up expired refresh tokens
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredTokens() {
    try {
      this.logger.log('Running scheduled job: cleanupExpiredTokens');

      const result = await this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

      this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // Additional scheduled job: verify Redis health
  @Cron(CronExpression.EVERY_12_HOURS)
  async verifyRedisHealth() {
    try {
      this.logger.log('Running scheduled job: verifyRedisHealth');

      // Ping Redis to verify connectivity
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      this.logger.log(`Redis health check passed (latency: ${latency}ms)`);
    } catch (error) {
      this.logger.warn(
        `Redis health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw - log warning and continue
      // Optionally send alert via email/notification service
    }
  }
}
