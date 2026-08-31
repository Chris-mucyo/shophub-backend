import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async suspendInactiveUsers() {
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
  }

  // Additional scheduled job: clean up expired refresh tokens
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredTokens() {
    this.logger.log('Running scheduled job: cleanupExpiredTokens');

    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
  }

  // Additional scheduled job: clean up expired Redis keys (handled by Redis TTL, but we can verify)
  @Cron(CronExpression.EVERY_12_HOURS)
  verifyRedisHealth() {
    this.logger.log('Running scheduled job: verifyRedisHealth');
    // This is a placeholder - Redis TTL handles expiration automatically
    // You could add health checks here if needed
  }
}
