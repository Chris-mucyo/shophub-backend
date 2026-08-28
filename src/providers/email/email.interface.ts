export interface EmailService {
    sendVerificationEmail(to: string, code: string): Promise<void>;
}