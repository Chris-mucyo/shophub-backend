import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { GoogleCallbackDto } from './dto/google-callback.dto';
import type { EmailService } from '../providers/email/email.interface';
import type { SmsService } from '../providers/sms/sms.interface';
import { REDIS_CLIENT } from '../redis/redis.provider';
import Redis from 'ioredis';
import { OAuth2Client } from 'google-auth-library';

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  googleId?: string;
  fullName?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    @Inject('EMAIL_SERVICE') private emailService: EmailService,
    @Inject('SMS_SERVICE') private smsService: SmsService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { phone: dto.phone }] },
    });
    if (existingUser) {
      throw new BadRequestException('Email or phone already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone,
        fullName: dto.fullName,
        password: hashedPassword,
        status: 'PENDING_EMAIL_VERIFICATION',
      },
    });

    const emailCode = this.generateCode();
    const phoneCode = this.generateCode();

    await this.redis.set(`email_verify:${user.id}`, emailCode, 'EX', 600);
    await this.redis.set(`phone_verify:${user.id}`, phoneCode, 'EX', 600);

    await this.emailService.sendVerificationEmail(user.email, emailCode);
    await this.smsService.sendVerificationSms(user.phone, phoneCode);

    return {
      message:
        'Registration successful. Check your email and phone for verification codes.',
      userId: user.id,
    };
  }

  async googleLogin(dto: GoogleAuthDto) {
    // Validate Google access token and get user info
    const googleUser = await this.validateGoogleToken(dto.accessToken);

    if (!googleUser.email) {
      throw new BadRequestException(
        'Google account must have a verified email',
      );
    }

    // Check if user exists with this Google ID
    let user = await this.prisma.user.findUnique({
      where: { googleId: googleUser.googleId },
    });

    if (user) {
      // User exists, update googleId if not set
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.googleId },
        });
      }
    } else {
      // Check if user exists with same email
      user = await this.prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (user) {
        // Link Google account to existing user
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.googleId,
            emailVerified: true, // Google emails are pre-verified
          },
        });
      } else {
        // Create new user with Google account
        // Generate a random password for the user (they can set a real one later)
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 12);

        user = await this.prisma.user.create({
          data: {
            email: googleUser.email,
            phone: `+2507${Math.floor(10000000 + Math.random() * 90000000)}`, // Temporary phone, user must update
            fullName: googleUser.fullName || 'Google User',
            password: hashedPassword,
            googleId: googleUser.googleId,
            emailVerified: true,
            status: 'PENDING_PHONE_VERIFICATION', // Phone still needs verification
          },
        });

        // Send phone verification code
        const phoneCode = this.generateCode();
        await this.redis.set(`phone_verify:${user.id}`, phoneCode, 'EX', 600);
        await this.smsService.sendVerificationSms(user.phone, phoneCode);
      }
    }

    // Check account status
    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new UnauthorizedException('Account is suspended or deleted');
    }

    return this.generateTokens(user.id, user.role);
  }

  private async validateGoogleToken(
    accessToken: string,
  ): Promise<GoogleUserInfo> {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
    );

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google access token');
    }

    const googleUser = (await response.json()) as GoogleUserInfo;

    if (!googleUser.email_verified) {
      throw new BadRequestException('Google email is not verified');
    }

    return {
      sub: googleUser.sub,
      email: googleUser.email.toLowerCase(),
      email_verified: googleUser.email_verified,
      name: googleUser.name,
      googleId: googleUser.sub,
      fullName: googleUser.name,
    };
  }

  async googleCallback(dto: GoogleCallbackDto) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    const oAuth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    // Exchange authorization code for tokens
    const { tokens } = await oAuth2Client.getToken(dto.code);
    oAuth2Client.setCredentials(tokens);

    if (!tokens.access_token) {
      throw new UnauthorizedException('Failed to obtain access token from Google');
    }

    // Get user info using the access token
    const googleUser = await this.validateGoogleToken(tokens.access_token);

    if (!googleUser.email) {
      throw new BadRequestException(
        'Google account must have a verified email',
      );
    }

    // Check if user exists with this Google ID
    let user = await this.prisma.user.findUnique({
      where: { googleId: googleUser.googleId },
    });

    if (user) {
      // User exists, update googleId if not set
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.googleId },
        });
      }
    } else {
      // Check if user exists with same email
      user = await this.prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (user) {
        // Link Google account to existing user
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.googleId,
            emailVerified: true, // Google emails are pre-verified
          },
        });
      } else {
        // Create new user with Google account
        // Password is nullable for Google OAuth users
        user = await this.prisma.user.create({
          data: {
            email: googleUser.email,
            phone: `+2507${Math.floor(10000000 + Math.random() * 90000000)}`, // Temporary phone, user must update
            fullName: googleUser.fullName || 'Google User',
            password: null, // Nullable for Google OAuth users
            googleId: googleUser.googleId,
            emailVerified: true,
            status: 'PENDING_PHONE_VERIFICATION', // Phone still needs verification
          },
        });

        // Send phone verification code
        const phoneCode = this.generateCode();
        await this.redis.set(`phone_verify:${user.id}`, phoneCode, 'EX', 600);
        await this.smsService.sendVerificationSms(user.phone, phoneCode);
      }
    }

    // Check account status
    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new UnauthorizedException('Account is suspended or deleted');
    }

    return this.generateTokens(user.id, user.role);
  }

  async verifyEmail(userId: string, dto: VerifyEmailDto) {
    const storedCode = await this.redis.get(`email_verify:${userId}`);
    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        status: 'PENDING_PHONE_VERIFICATION',
      },
    });
    await this.redis.del(`email_verify:${userId}`);
    return {
      message: 'Email verified successfully. Please verify your phone.',
    };
  }

  async verifyPhone(userId: string, dto: VerifyPhoneDto) {
    const storedCode = await this.redis.get(`phone_verify:${userId}`);
    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        status: 'PENDING_PROFILE',
      },
    });
    await this.redis.del(`phone_verify:${userId}`);
    return {
      message: 'Phone verified successfully. Please complete your profile.',
    };
  }

  async resendEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.emailVerified)
      throw new BadRequestException('Email already verified');

    const emailCode = this.generateCode();
    await this.redis.set(`email_verify:${user.id}`, emailCode, 'EX', 600);
    await this.emailService.sendVerificationEmail(user.email, emailCode);
    return { message: 'Verification code sent to email' };
  }

  async resendPhoneVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.phoneVerified)
      throw new BadRequestException('Phone already verified');

    const phoneCode = this.generateCode();
    await this.redis.set(`phone_verify:${user.id}`, phoneCode, 'EX', 600);
    await this.smsService.sendVerificationSms(user.phone, phoneCode);
    return { message: 'Verification code sent to phone' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      // Return same message to prevent email enumeration
      return { message: 'If the email exists, a reset token has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.redis.set(
      `password_reset_token:${resetToken}`,
      user.id,
      'EX',
      900,
    );

    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
    // Optional: also send via SMS
    // await this.smsService.sendPasswordResetSms(user.phone, resetToken);

    return { message: 'If the email exists, a reset token has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const userId = await this.redis.get(`password_reset_token:${dto.token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all refresh tokens for this user
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    await this.redis.del(`password_reset_token:${dto.token}`);
    return { message: 'Password reset successful' };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new UnauthorizedException('Account is suspended or deleted');
    }

    return this.generateTokens(user.id, user.role);
  }

  async refreshTokens(dto: RefreshDto) {
    const refreshToken = dto.refreshToken;
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !storedToken ||
      storedToken.revoked ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    return this.generateTokens(storedToken.userId, storedToken.user.role);
  }

  async logout(dto: RefreshDto) {
    const refreshToken = dto.refreshToken;
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });

    return { message: 'Logged out successfully' };
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async generateTokens(userId: string, role: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, role, type: 'access' },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
