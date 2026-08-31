# ShopHub Authentication Setup Guide

Complete authentication system for the ShopHub B2B marketplace.

---

## Overview

The auth module provides:
- **Email/Phone Registration** with sequential verification flow
- **JWT Authentication** (access + refresh tokens)
- **Google OAuth 2.0** (Authorization Code Flow for production, Access Token Flow for development)
- **Password Reset** via email
- **Admin User Management** (validated status transitions)
- **Automated Cleanup** (suspended inactive users, expired tokens, Redis health checks)

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Redis (Upstash requires TLS)
REDIS_URL="rediss://default:password@host.upstash.io:6379"

# JWT
JWT_ACCESS_SECRET="long-random-string"
JWT_REFRESH_SECRET="another-long-random-string"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email Provider: 'mock' | 'sendgrid'
EMAIL_PROVIDER="mock"
SENDGRID_API_KEY="SG.xxx"
EMAIL_FROM="no-reply@shophub.rw"

# SMS Provider: 'mock' | 'africastalking' | 'twilio'
SMS_PROVIDER="mock"
AFRICASTALKING_API_KEY=""
AFRICASTALKING_USERNAME=""
AFRICASTALKING_SENDER_ID=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""

# Google OAuth
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"

# Frontend
FRONTEND_URL="http://localhost:3000"

# Application
PORT=3000
NODE_ENV="development"
```

---

## Database Schema (Prisma)

```prisma
enum UserStatus {
  PENDING_EMAIL_VERIFICATION
  PENDING_PHONE_VERIFICATION
  PENDING_PROFILE
  PENDING_VERIFICATION
  ACTIVE
  SUSPENDED
  REJECTED
  DELETED
}

enum WholesalerStatus {
  NOT_APPLIED
  PENDING
  APPROVED
  REJECTED
}

model User {
  id               String           @id @default(uuid())
  email            String           @unique
  phone            String           @unique
  password         String?          // Nullable for Google OAuth users
  fullName         String
  status           UserStatus       @default(PENDING_EMAIL_VERIFICATION)
  emailVerified    Boolean          @default(false)
  phoneVerified    Boolean          @default(false)
  role             Role             @default(RETAILER)
  wholesalerStatus WholesalerStatus @default(NOT_APPLIED)
  googleId         String?          @unique  // Google OAuth

  // KYC fields...
  refreshTokens    RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_google_oauth_fields
npx prisma generate
```

---

## Sequential Verification Flow

```
┌─────────────────────────┐
│   Register (POST)       │
│   status: PENDING_      │
│   EMAIL_VERIFICATION    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Verify Email (POST)   │
│   status: PENDING_      │
│   PHONE_VERIFICATION    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Verify Phone (POST)   │
│   status: PENDING_      │
│   PROFILE               │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Submit Profile (POST) │
│   status: PENDING_      │
│   VERIFICATION          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Admin Approves        │
│   status: ACTIVE        │
└─────────────────────────┘
```

---

## API Endpoints

### Public Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user (email + phone) |
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/google` | **Deprecated** - Google OAuth (access token, dev only) |
| POST | `/auth/google/callback` | Google OAuth (authorization code flow, production) |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |

### Protected Auth Endpoints (Require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/verify-email` | Verify email with 6-digit code |
| POST | `/auth/verify-phone` | Verify phone with 6-digit code |
| POST | `/auth/resend-email-verification` | Resend email code |
| POST | `/auth/resend-phone-verification` | Resend phone code |

### User Profile Endpoints (Require JWT)

| Method | Endpoint | Roles |
|--------|----------|-------|
| GET | `/users/profile` | RETAILER, WHOLESALER, ADMIN |
| POST | `/users/profile` | RETAILER, WHOLESALER |
| POST | `/users/wholesaler/apply` | RETAILER |

### Admin Endpoints (Require ADMIN Role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/profiles/pending` | List pending KYC profiles |
| GET | `/admin/wholesalers/pending` | List pending wholesaler applications |
| PATCH | `/admin/users/:id/status` | Update user status |
| PATCH | `/admin/users/:id/wholesaler-status` | Update wholesaler status |
| GET | `/admin/users` | List all users with filters |

---

## Request/Response Examples

### Register
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "phone": "+250788123456",
    "fullName": "John Doe",
    "password": "Secure@123"
  }'

# Response
{
  "message": "Registration successful. Check your email and phone for verification codes.",
  "userId": "uuid"
}
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "Secure@123"}'

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

### Verify Email
```bash
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'

# Response
{
  "message": "Email verified successfully. Please verify your phone."
}
```

### Verify Phone
```bash
curl -X POST http://localhost:3000/auth/verify-phone \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'

# Response
{
  "message": "Phone verified successfully. Please complete your profile."
}
```

### Google OAuth - Authorization Code Flow (Production)
```bash
# 1. Frontend redirects user to Google OAuth consent screen:
# https://accounts.google.com/o/oauth2/v2/auth?
#   client_id=YOUR_CLIENT_ID&
#   redirect_uri=http://localhost:3000/auth/google/callback&
#   response_type=code&
#   scope=email%20profile&
#   access_type=offline

# 2. Google redirects back to your frontend with ?code=AUTH_CODE
# 3. Frontend sends code to backend:
curl -X POST http://localhost:3000/auth/google/callback \
  -H "Content-Type: application/json" \
  -d '{"code": "4/0AX4XfWi..."}'

# Response (same as login)
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

### Google OAuth - Access Token Flow (Development Only)
> **⚠️ Deprecated in production.** Only works when `NODE_ENV !== 'production'`.
```bash
# Frontend gets access_token from Google Sign-In (One Tap / button)
curl -X POST http://localhost:3000/auth/google \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "ya29.a0AfH6SMC..."}'

# Response (same as login)
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

### Forgot Password
```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Response (always same to prevent enumeration)
{
  "message": "If the email exists, a reset token has been sent."
}
```

### Reset Password
```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "reset_token_from_email", "newPassword": "NewPass@123"}'
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "a1b2c3d4e5f6..."}'
```

### Logout
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "a1b2c3d4e5f6..."}'
```

### Submit Profile (KYC) - File Upload
> **Important:** This endpoint accepts **file uploads** via `multipart/form-data`. Do NOT send URL strings.

```bash
curl -X POST http://localhost:3000/users/profile \
  -H "Authorization: Bearer <access_token>" \
  -F 'nationalIdNumber=1234567890123456' \
  -F 'addressDistrict=Kicukiro' \
  -F 'addressSector=Kagarama' \
  -F 'addressCell=Gatenga' \
  -F 'addressVillage=Gatenga' \
  -F 'nationalIdImage=@/path/to/national-id.jpg' \
  -F 'selfieImage=@/path/to/selfie.jpg' \
  -F 'proofOfAddress=@/path/to/utility-bill.jpg'
```

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| nationalIdNumber | string (form) | 16-digit national ID |
| addressDistrict | string (form) | District |
| addressSector | string (form) | Sector |
| addressCell | string (form) | Cell |
| addressVillage | string (form) | Village |
| nationalIdImage | file | JPG/PNG - National ID card |
| selfieImage | file | JPG/PNG - Selfie with ID |
| proofOfAddress | file | JPG/PNG/PDF - Utility bill, bank statement |

**Response:**
```json
{
  "message": "Profile submitted successfully. Awaiting admin verification."
}
```

### Apply for Wholesaler - File Upload
```bash
curl -X POST http://localhost:3000/users/wholesaler/apply \
  -H "Authorization: Bearer <access_token>" \
  -F 'businessName=My Wholesale Co' \
  -F 'tin=123456789' \
  -F 'businessRegNo=REG123' \
  -F 'businessAddress=Kigali, Rwanda' \
  -F 'businessCategory=Electronics' \
  -F 'businessDocUrl=@/path/to/business-license.pdf'
```

**Required Fields:**
| Field | Type | Description |
|-------|------|-------------|
| businessName | string (form) | Business name |
| tin | string (form) | Tax Identification Number |
| businessRegNo | string (form) | Business Registration Number |
| businessAddress | string (form) | Business address |
| businessCategory | string (form) | Business category |
| businessDocUrl | file | PDF/JPG/PNG - Business license |

### Admin: Update User Status
```bash
curl -X PATCH http://localhost:3000/admin/users/<userId>/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "ACTIVE", "rejectionReason": "Optional reason"}'
```

**Valid Transitions (Enforced by AdminService):**

| From | To Allowed |
|------|------------|
| PENDING_EMAIL_VERIFICATION | ACTIVE, SUSPENDED, DELETED |
| PENDING_PHONE_VERIFICATION | ACTIVE, SUSPENDED, DELETED |
| PENDING_PROFILE | PENDING_VERIFICATION, SUSPENDED, DELETED |
| PENDING_VERIFICATION | ACTIVE, REJECTED, SUSPENDED, DELETED |
| ACTIVE | SUSPENDED, DELETED |
| SUSPENDED | ACTIVE, DELETED |
| REJECTED | PENDING_VERIFICATION, DELETED |
| DELETED | (none) |

**Wholesaler Status Transitions:**

| From | To Allowed |
|------|------------|
| NOT_APPLIED | (user applies via POST /users/wholesaler/apply) |
| PENDING | APPROVED, REJECTED |
| APPROVED | REJECTED (revoke approval) |
| REJECTED | PENDING (allow re-application) |

### Admin: Update Wholesaler Status
```bash
curl -X PATCH http://localhost:3000/admin/users/<userId>/wholesaler-status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "APPROVED", "rejectionReason": "Optional"}'
```

---

## Using CurrentUser Decorator

```typescript
import { CurrentUser } from './auth/decorators/current-user.decorator';

@Controller('example')
export class ExampleController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: { id: string; role: string }) {
    return user; // { id: "uuid", role: "RETAILER" }
  }

  @Get('my-id')
  @UseGuards(JwtAuthGuard)
  getMyId(@CurrentUser('id') userId: string) {
    return { userId };
  }
}
```

---

## Swagger Documentation

Access at: `http://localhost:3000/api/docs`

All endpoints documented with:
- `@ApiTags` for grouping
- `@ApiBearerAuth` for protected routes
- `@ApiBody`, `@ApiResponse`, `@ApiOperation`, `@ApiConsumes` for request/response schemas

---

## Scheduled Jobs

### Daily at Midnight
- **Suspend Inactive Users**: Users in `PENDING_PROFILE` > 7 days → `SUSPENDED`
- **Cleanup Expired Tokens**: Delete expired refresh tokens

### Every 12 Hours
- **Redis Health Check**: Ping Redis, log latency. Errors are caught and logged as warnings (no crash).

**Error Handling:**
- All scheduled jobs wrap operations in try/catch
- Errors are logged with stack traces
- Application continues running even if individual jobs fail

---

## Provider Abstraction

### Email Providers
```typescript
// email.module.ts factory
EMAIL_PROVIDER=mock     // MockEmailService (logs to console)
EMAIL_PROVIDER=sendgrid // SendGridEmailService
```

### SMS Providers
```typescript
// sms.module.ts factory
SMS_PROVIDER=mock           // MockSmsService
SMS_PROVIDER=africastalking // AfricaTalkingSmsService
SMS_PROVIDER=twilio         // TwilioSmsService
```

### Adding New Provider
1. Create service implementing `EmailService` / `SmsService` interface
2. Add case in factory function in respective module
3. Set env var

---

## Security Features

- **Password Hashing**: bcrypt with cost 12
- **Refresh Tokens**: SHA-256 hashed in DB, 7-day expiry
- **Rate Limiting**: Throttler (100 req/min global, stricter on auth: 5 req/min on `/auth/google` and `/auth/google/callback`)
- **CORS**: Configured via `FRONTEND_URL` env var using ConfigService
- **Helmet**: Security headers (add `@nestjs/helmet` if needed)
- **Input Validation**: class-validator DTOs
- **SQL Injection**: Prisma parameterized queries
- **Google OAuth**: Authorization Code Flow with PKCE support (via google-auth-library)

---

## Testing Checklist

- [ ] Register → verify email → verify phone → submit profile (files) → admin approve
- [ ] Login with email/password
- [ ] Google OAuth Authorization Code Flow (production)
- [ ] Google OAuth Access Token Flow (development only)
- [ ] Forgot/reset password flow
- [ ] Refresh token rotation
- [ ] Logout revokes refresh token
- [ ] Admin status transitions (valid + invalid - should reject)
- [ ] Wholesaler application + approval/rejection
- [ ] Scheduler suspends inactive users (manual trigger test)
- [ ] Redis health check logs warnings on failure
- [ ] Swagger docs accessible with file upload examples

---

## Common Issues

| Issue | Solution |
|-------|----------|
| `googleId` column missing | Run `npx prisma db push --accept-data-loss` |
| Redis ECONNRESET | Ensure `REDIS_URL` uses `rediss://` for Upstash |
| Google OAuth fails | Check `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| Email/SMS not sending | Verify `EMAIL_PROVIDER`/`SMS_PROVIDER` env vars and API keys |
| Port 3000 in use | Kill existing process or change `PORT` env var |
| File upload fails | Check `CLOUDINARY_*` env vars; ensure files are sent as multipart/form-data |
| Google OAuth "access token flow disabled" | Use `/auth/google/callback` with authorization code in production |

---

## Implementation Notes

### Google OAuth Flows

**Authorization Code Flow (Recommended for Production):**
1. Frontend redirects to Google consent screen
2. Google redirects to `GOOGLE_CALLBACK_URL` with `code`
3. Frontend extracts `code` and calls `POST /auth/google/callback`
4. Backend exchanges `code` for tokens using `google-auth-library`
5. Backend validates user info and creates/logs in user

**Access Token Flow (Development Only):**
1. Frontend uses Google Sign-In (One Tap) to get `access_token`
2. Frontend calls `POST /auth/google` with `accessToken`
3. Backend validates token via Google UserInfo API
4. **Disabled in production** (`NODE_ENV === 'production'`)

### File Upload Handling

- Uses `FilesInterceptor` from `@nestjs/platform-express`
- Files uploaded to Cloudinary via `CloudinaryService`
- Cloudinary URLs saved to database
- Maximum 5 files for profile, 2 for wholesaler application

### Rate Limiting

- Global: 100 requests/minute
- Auth endpoints: 5 requests/minute (register, login, google, google/callback)
- Verification endpoints: 10 requests/minute
- Password reset: 3 requests/minute

### CORS Configuration

Configured in `main.ts` using `ConfigService`:
```typescript
const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
app.enableCors({
  origin: frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
});
```