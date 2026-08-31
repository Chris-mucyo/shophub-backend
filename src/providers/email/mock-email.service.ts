import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.interface';

@Injectable()
export class MockEmailService implements EmailService {
  private logger = new Logger('MockEmail');
  sendVerificationEmail(to: string, code: string) {
    this.logger.log(`[MOCK] Verification code for ${to}: ${code}`);
    return Promise.resolve();
  }
  sendPasswordResetEmail(to: string, token: string) {
    this.logger.log(`[MOCK] Password reset token for ${to}: ${token}`);
    return Promise.resolve();
  }
  sendWelcomeEmail(to: string, name: string) {
    this.logger.log(`[MOCK] Welcome email sent to ${to} (${name})`);
    return Promise.resolve();
  }
}
