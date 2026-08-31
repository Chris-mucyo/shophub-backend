import { Injectable, Logger } from '@nestjs/common';
import { SmsService } from './sms.interface';

@Injectable()
export class MockSmsService implements SmsService {
  private logger = new Logger('MockSMS');
  sendVerificationSms(to: string, code: string) {
    this.logger.log(`[MOCK] SMS to ${to}: code ${code}`);
    return Promise.resolve();
  }
  sendPasswordResetSms(to: string, token: string) {
    this.logger.log(`[MOCK] Password reset SMS to ${to}: token ${token}`);
    return Promise.resolve();
  }
  sendWelcomeSms(to: string, name: string) {
    this.logger.log(`[MOCK] Welcome SMS sent to ${to} (${name})`);
    return Promise.resolve();
  }
}
