import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import { SmsService } from './sms.interface';

@Injectable()
export class TwilioSmsService implements SmsService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor(private config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID') ?? '';
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN') ?? '';
    this.fromNumber = this.config.get<string>('TWILIO_PHONE_NUMBER') ?? '';
    this.client = twilio(accountSid, authToken);
  }

  async sendVerificationSms(to: string, code: string): Promise<void> {
    await this.client.messages.create({
      body: `Your ShopHub code: ${code}`,
      from: this.fromNumber,
      to,
    });
  }

  async sendPasswordResetSms(to: string, token: string): Promise<void> {
    await this.client.messages.create({
      body: `Your ShopHub password reset token: ${token}`,
      from: this.fromNumber,
      to,
    });
  }

  async sendWelcomeSms(to: string, name: string): Promise<void> {
    await this.client.messages.create({
      body: `Welcome to ShopHub, ${name}!`,
      from: this.fromNumber,
      to,
    });
  }
}
