export interface SmsService {
  sendVerificationSms(to: string, code: string): Promise<void>;
  sendPasswordResetSms(to: string, token: string): Promise<void>;
  sendWelcomeSms(to: string, name: string): Promise<void>;
}
