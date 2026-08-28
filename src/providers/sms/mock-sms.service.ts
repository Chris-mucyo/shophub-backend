import { Injectable, Logger } from '@nestjs/common';
import { SmsService } from './sms.interface';

@Injectable()
export class MockSmsService implements SmsService {
    private logger = new Logger('MockSMS');
    async sendVerificationSms(to: string, code: string) {
        this.logger.log(`[MOCK] SMS to ${to}: code ${code}`);
    }
}