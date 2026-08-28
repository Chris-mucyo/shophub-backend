import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email.interface';

@Injectable()
export class MockEmailService implements EmailService {
    private logger = new Logger('MockEmail');
    async sendVerificationEmail(to: string, code: string) {
        this.logger.log(`[MOCK] Verification code for ${to}: ${code}`);
    }
}