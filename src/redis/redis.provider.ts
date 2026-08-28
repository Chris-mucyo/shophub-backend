import { Provider } from '@nestjs/common';
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

        return new Redis(redisUrl);
    },
    inject: [ConfigService],
};
