import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { EmailService } from './email.interface';

@Injectable()
export class SendGridEmailService implements EmailService {
    constructor(private config: ConfigService) {
        sgMail.setApiKey(this.config.get<string>('SENDGRID_API_KEY')!);
    }

    async sendVerificationEmail(to: string, code: string) {
        const msg = {
            to,
            from: this.config.get<string>('EMAIL_FROM')!,
            subject: 'Verify your email',
            text: `Code: ${code}`,
        };

        await sgMail.send(msg);
    }
}
