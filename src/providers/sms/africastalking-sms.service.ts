import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AfricasTalking from 'africastalking';
import { SmsService } from './sms.interface';

interface AfricasTalkingClient {
  SMS: {
    send: (options: {
      to: string;
      message: string;
      from: string;
    }) => Promise<unknown>;
  };
}

interface AfricasTalkingInit {
  (options: { apiKey: string; username: string }): AfricasTalkingClient;
}

@Injectable()
export class AfricaTalkingSmsService implements SmsService {
  private client: AfricasTalkingClient;
  private senderId: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('AFRICASTALKING_API_KEY') ?? '';
    const username = this.config.get<string>('AFRICASTALKING_USERNAME') ?? '';
    this.senderId = this.config.get<string>('AFRICASTALKING_SENDER_ID') ?? '';
    const init = AfricasTalking as unknown as AfricasTalkingInit;
    this.client = init({ apiKey, username });
  }

  async sendVerificationSms(to: string, code: string): Promise<void> {
    await this.client.SMS.send({
      to,
      message: `Your ShopHub code: ${code}`,
      from: this.senderId,
    });
  }

  async sendPasswordResetSms(to: string, token: string): Promise<void> {
    await this.client.SMS.send({
      to,
      message: `Your ShopHub password reset token: ${token}`,
      from: this.senderId,
    });
  }

  async sendWelcomeSms(to: string, name: string): Promise<void> {
    await this.client.SMS.send({
      to,
      message: `Welcome to ShopHub, ${name}!`,
      from: this.senderId,
    });
  }
}
