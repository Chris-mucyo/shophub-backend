export interface SmsService {
    sendVerificationSms(to: string, code: string): Promise<void>;
}