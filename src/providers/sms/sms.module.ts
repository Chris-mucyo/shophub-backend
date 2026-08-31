import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockSmsService } from './mock-sms.service';
import { AfricaTalkingSmsService } from './africastalking-sms.service';
import { TwilioSmsService } from './twilio-sms.service';
import { SmsService } from './sms.interface';

type SmsProvider = 'mock' | 'africastalking' | 'twilio';

@Module({
  providers: [
    {
      provide: 'SMS_SERVICE',
      useFactory: (config: ConfigService): SmsService => {
        const provider = config.get<SmsProvider>('SMS_PROVIDER');
        if (provider === 'africastalking') {
          return new AfricaTalkingSmsService(config);
        }
        if (provider === 'twilio') {
          return new TwilioSmsService(config);
        }
        return new MockSmsService();
      },
      inject: [ConfigService],
    },
  ],
  exports: ['SMS_SERVICE'],
})
export class SmsModule {}
