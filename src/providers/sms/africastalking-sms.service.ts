import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AfricasTalking from 'africastalking';
import { SmsService } from './sms.interface';

@Injectable()
export class AfricaTalkingSmsService implements SmsService {
    private client: any;
    private senderId: string;
    constructor(private config: ConfigService) {
        const apiKey = this.config.get('AFRICASTALKING_API_KEY');
        const username = this.config.get('AFRICASTALKING_USERNAME');
        this.senderId = <string>this.config.get('AFRICASTALKING_SENDER_ID');
        this.client = AfricasTalking({ apiKey, username });
    }
    async sendVerificationSms(to: string, code: string) {
        const sms = this.client.SMS;
        await sms.send({ to, message: `Your ShopHub code: ${code}`, from: this.senderId });
    }
}