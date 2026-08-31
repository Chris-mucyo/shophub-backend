import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockEmailService } from './mock-email.service';
import { SendGridEmailService } from './sendgrid-email.service';
import { EmailService } from './email.interface';

type EmailProvider = 'mock' | 'sendgrid';

@Module({
  providers: [
    {
      provide: 'EMAIL_SERVICE',
      useFactory: (config: ConfigService): EmailService => {
        const provider = config.get<EmailProvider>('EMAIL_PROVIDER');
        if (provider === 'sendgrid') {
          return new SendGridEmailService(config);
        }
        return new MockEmailService();
      },
      inject: [ConfigService],
    },
  ],
  exports: ['EMAIL_SERVICE'],
})
export class EmailModule {}
