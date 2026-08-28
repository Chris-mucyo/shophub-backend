import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockSmsService } from './mock-sms.service';
import { AfricaTalkingSmsService } from './africastalking-sms.service';
import { SmsService } from './sms.interface';

@Module({
    providers: [
        {
            provide: 'SMS_SERVICE',
            useFactory: (config: ConfigService): SmsService => {
                const provider = config.get('SMS_PROVIDER');
                if (provider === 'africastalking') {
                    return new AfricaTalkingSmsService(config);
                }
                return new MockSmsService();
            },
            inject: [ConfigService],
        },
    ],
    exports: ['SMS_SERVICE'],
})
export class SmsModule {}