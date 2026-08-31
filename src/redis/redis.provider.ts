import { Provider, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (config: ConfigService) => {
    const redisUrl = config.get<string>('REDIS_URL');

    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined');
    }

    const logger = new Logger('RedisClient');

    // Parse URL to check if TLS is needed (Upstash requires TLS)
    const isUpstash = redisUrl.includes('upstash.io');
    const useTLS = redisUrl.startsWith('rediss://') || isUpstash;

    // Ensure correct protocol for Upstash
    let connectionUrl = redisUrl;
    if (isUpstash && !redisUrl.startsWith('rediss://')) {
      connectionUrl = redisUrl.replace('redis://', 'rediss://');
      logger.log('Upstash detected: switched to rediss:// (TLS)');
    }

    const client = new Redis(connectionUrl, {
      // Connection settings
      lazyConnect: true, // Don't connect immediately; wait for first command
      maxRetriesPerRequest: 3, // Retry failed commands up to 3 times

      // Retry strategy with exponential backoff
      retryStrategy: (times: number) => {
        if (times > 10) {
          // Stop retrying after 10 attempts
          logger.error('Redis max retry attempts reached. Giving up.');
          return null;
        }
        // Exponential backoff: 100ms, 200ms, 400ms, 800ms... capped at 3000ms
        const delay = Math.min(100 * Math.pow(2, times), 3000);
        logger.warn(
          `Redis connection lost. Retrying in ${delay}ms (attempt ${times})`,
        );
        return delay;
      },

      // Reconnect on error (serverless Redis may close idle connections)
      reconnectOnError: (err: Error) => {
        const targetErrors = [
          'ECONNRESET',
          'ETIMEDOUT',
          'ECONNREFUSED',
          'ENOTFOUND',
        ];
        return targetErrors.some((e) => err.message.includes(e));
      },

      // TLS configuration for Upstash
      tls: useTLS ? {} : undefined,

      // Connection pool (optional, for higher throughput)
      family: 4, // Force IPv4 (avoids some DNS issues)
      connectTimeout: 10000, // 10s connection timeout
      commandTimeout: 5000, // 5s command timeout
    });

    // Event handlers to prevent "Unhandled error event" warnings
    client.on('connect', () => {
      logger.log('Redis connected');
    });

    client.on('ready', () => {
      logger.log('Redis ready to accept commands');
    });

    client.on('error', (err: Error) => {
      // This prevents "Unhandled error event" - errors are now handled
      logger.error(`Redis error: ${err.message}`);
    });

    client.on('close', () => {
      logger.warn('Redis connection closed');
    });

    client.on('reconnecting', () => {
      logger.log('Redis reconnecting...');
    });

    client.on('end', () => {
      logger.log('Redis connection ended');
    });

    // Graceful shutdown handler
    const shutdown = () => {
      logger.log('Closing Redis connection...');
      void client.quit();
    };

    // Handle process termination
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return client;
  },
  inject: [ConfigService],
};
