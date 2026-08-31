import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { EmailService } from './email.interface';

interface SendGridResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
}

@Injectable()
export class SendGridEmailService implements EmailService {
  constructor(private config: ConfigService) {
    sgMail.setApiKey(this.config.get<string>('SENDGRID_API_KEY')!);
  }

  async sendVerificationEmail(to: string, code: string): Promise<void> {
    const msg = {
      to,
      from: this.config.get<string>('EMAIL_FROM')!,
      subject: 'Verify your email',
      text: `Code: ${code}`,
    };

    (await sgMail.send(msg)) as unknown as SendGridResponse;
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const msg = {
      to,
      from: this.config.get<string>('EMAIL_FROM')!,
      subject: 'Reset your password',
      text: `Your password reset token: ${token}`,
    };
    (await sgMail.send(msg)) as unknown as SendGridResponse;
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const msg = {
      to,
      from: this.config.get<string>('EMAIL_FROM')!,
      subject: 'Welcome to ShopHub!',
      text: `Hello ${name},\n\nWelcome to ShopHub, Rwanda's B2B marketplace!`,
    };
    (await sgMail.send(msg)) as unknown as SendGridResponse;
  }
}
