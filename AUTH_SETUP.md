# ShopHub Authentication Module - Setup & Testing Guide

## Overview

This document provides complete setup instructions and testing procedures for the ShopHub authentication module, including Google OAuth integration.

## 1. Environment Variables

### Required Variables (`.env`)

```env
# Database
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"

# Redis (for verification codes & password reset tokens)
REDIS_URL="redis://default:pass@host:port"

# JWT Secrets (generate strong random strings for production)
JWT_ACCESS_SECRET="your-super-secret-access-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Cloudinary (for KYC document uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email Provider: 'mock' | 'sendgrid'
EMAIL_PROVIDER="mock"
SENDGRID_API_KEY="SG.your-sendgrid-key"
EMAIL_FROM="no-reply@shophub.rw"

# SMS Provider: 'mock' | 'africastalking' | 'twilio'
SMS_PROVIDER="mock"

# Africa's Talking (Rwanda SMS)
AFRICASTALKING_API_KEY=""
AFRICASTALKING_USERNAME=""
AFRICASTALKING_SENDER_ID="SHOPHUB"

# Twilio (Alternative SMS)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER="+1234567890"

# Google OAuth (REQUIRED for Google Login)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"

# Admin Seed
ADMIN_EMAIL="admin@shophub.rw"
ADMIN_PASSWORD="Admin@123"
ADMIN_PHONE="+250700000000"
```

---

## 2. Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google OAuth 2.0 API** (or **Google Identity**)

### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type
3. Fill required fields:
   - App name: `ShopHub`
   - User support email: your email
   - Developer contact: your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users (your email) during development

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Web application**
4. Name: `ShopHub Web Client`
5. **Authorized redirect URIs:**
   - Development: `http://localhost:3000/auth/google/callback`
   - Production: `https://api.shophub.rw/auth/google/callback`
6. Save and copy **Client ID** and **Client Secret**

### Step 4: Update Environment Variables

```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"
```

---

## 3. Database Migration

After adding `googleId` field to User model:

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add_google_id

# Or push directly (development)
npx prisma db push
```

---

## 4. Running the Application

```bash
# Install dependencies
npm install

# Build
npm run build

# Development
npm run start:dev

# Production
npm run start:prod
```

---

## 5. API Endpoints

### Authentication Endpoints (`/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Email/password registration |
| POST | `/auth/login` | No | Email/password login |
| POST | `/auth/google` | No | Google OAuth login/register |
| POST | `/auth/verify-email` | JWT | Verify email code |
| POST | `/auth/verify-phone` | JWT | Verify phone code |
| POST | `/auth/resend-email-verification` | JWT | Resend email code |
| POST | `/auth/resend-phone-verification` | JWT | Resend phone code |
| POST | `/auth/forgot-password` | No | Request password reset |
| POST | `/auth/reset-password` | No | Reset password with token |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | No | Revoke refresh token |

### User Endpoints (`/users`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/users/profile` | JWT | RETAILER, WHOLESALER, ADMIN | Get current user profile |
| POST | `/users/profile` | JWT | RETAILER, WHOLESALER | Submit KYC profile (multipart) |
| POST | `/users/wholesaler/apply` | JWT | RETAILER | Apply for wholesaler (multipart) |

### Admin Endpoints (`/admin`)

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/admin/profiles/pending` | JWT | ADMIN | List pending KYC profiles |
| GET | `/admin/wholesalers/pending` | JWT | ADMIN | List pending wholesaler apps |
| PATCH | `/admin/users/:id/status` | JWT | ADMIN | Update user status |
| PATCH | `/admin/users/:id/wholesaler-status` | JWT | ADMIN | Update wholesaler status |
| GET | `/admin/users` | JWT | ADMIN | List all users with filters |

---

## 6. Testing with Postman/cURL

### 6.1 Register User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+250788123456",
    "fullName": "John Doe",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "message": "Registration successful. Check your email and phone for verification codes.",
  "userId": "uuid"
}
```

### 6.2 Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

### 6.3 Google OAuth Login

**Frontend Flow:**
1. Redirect user to Google OAuth:
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=YOUR_CLIENT_ID&
     redirect_uri=http://localhost:3000/auth/google/callback&
     response_type=token&
     scope=email%20profile&
     access_type=online
   ```

2. Google redirects back with `access_token` in URL fragment

3. Send token to backend:
```bash
curl -X POST http://localhost:3000/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "ya29.a0AfH6SMC..."
  }'
```

**Response:** Same as login - returns `accessToken` and `refreshToken`

### 6.4 Verify Email (Requires JWT)

```bash
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"code": "123456"}'
```

### 6.5 Verify Phone (Requires JWT)

```bash
curl -X POST http://localhost:3000/auth/verify-phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"code": "123456"}'
```

### 6.6 Forgot Password

```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 6.7 Reset Password

```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-from-email",
    "newPassword": "NewSecurePass123!"
  }'
```

### 6.8 Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your-refresh-token"}'
```

### 6.9 Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your-refresh-token"}'
```

### 6.10 Submit KYC Profile (Multipart)

```bash
curl -X POST http://localhost:3000/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "nationalIdNumber=1234567890123456" \
  -F "addressDistrict=Kicukiro" \
  -F "addressSector=Kagarama" \
  -F "addressCell=Kigarama" \
  -F "addressVillage=Umurenge" \
  -F "nationalIdImage=@/path/to/id.jpg" \
  -F "selfieImage=@/path/to/selfie.jpg" \
  -F "proofOfAddress=@/path/to/bill.pdf"
```

### 6.11 Apply for Wholesaler (Multipart)

```bash
curl -X POST http://localhost:3000/users/wholesaler/apply \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "businessName=My Wholesale Shop" \
  -F "tin=123456789" \
  -F "businessRegNo=12345/RDB/2024" \
  -F "businessAddress=Kigali, Rwanda" \
  -F "businessCategory=Electronics" \
  -F "businessDocUrl=@/path/to/certificate.pdf"
```

### 6.12 Admin: Approve Profile

```bash
curl -X PATCH http://localhost:3000/admin/users/USER_ID/status \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "ACTIVE"}'
```

### 6.13 Admin: Approve Wholesaler

```bash
curl -X PATCH http://localhost:3000/admin/users/USER_ID/wholesaler-status \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "APPROVED"}'
```

---

## 7. Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Register | 5 req/min | 60s |
| Login | 5 req/min | 60s |
| Google Login | 5 req/min | 60s |
| Forgot Password | 3 req/min | 60s |
| Reset Password | 3 req/min | 60s |
| Verify Email/Phone | 10 req/min | 60s |
| Resend Verification | 5 req/min | 60s |

---

## 8. User Status Flow

```
PENDING_EMAIL_VERIFICATION
    │
    ├── verify email ───► PENDING_PHONE_VERIFICATION
    │                         │
    │                         └── verify phone ───► PENDING_PROFILE
    │                                                     │
    │                                                     ├── submit profile ───► PENDING_VERIFICATION
    │                                                     │                         │
    │                                                     │                         ├── admin approves ───► ACTIVE
    │                                                     │                         │
    │                                                     │                         └── admin rejects ───► REJECTED
    │                                                     │
    │                                                     └── 7 days no profile ───► SUSPENDED (via cron)
    │
    └── (suspended/deleted) ───► SUSPENDED / DELETED
```

---

## 9. Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | BadRequestException | Invalid input, expired codes, invalid transitions |
| 401 | UnauthorizedException | Invalid credentials, invalid/expired tokens |
| 403 | ForbiddenException | Insufficient permissions |
| 404 | NotFoundException | User not found |
| 429 | TooManyRequests | Rate limit exceeded |

---

## 10. Swagger Documentation

Access interactive API docs at:
```
http://localhost:3000/api/docs
```

---

## 11. Production Checklist

- [ ] Use strong JWT secrets (32+ random chars)
- [ ] Set `EMAIL_PROVIDER=sendgrid` with valid API key
- [ ] Set `SMS_PROVIDER=africastalking` or `twilio` with credentials
- [ ] Configure production Google OAuth redirect URI
- [ ] Enable HTTPS in production
- [ ] Set secure CORS origin (`FRONTEND_URL`)
- [ ] Configure Redis with password and TLS
- [ ] Set up database connection pooling
- [ ] Enable Prisma query logging in development only
- [ ] Set up monitoring for cron jobs
- [ ] Configure backup for PostgreSQL

---

## 12. Project Structure

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   └── current-user.decorator.ts
│   ├── dto/
│   │   ├── register.dto.ts
│   │   ├── login.dto.ts
│   │   ├── verify-email.dto.ts
│   │   ├── verify-phone.dto.ts
│   │   ├── refresh.dto.ts
│   │   ├── forgot-password.dto.ts
│   │   ├── reset-password.dto.ts
│   │   └── google-auth.dto.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── strategies/
│       ├── jwt.strategy.ts
│       └── google.strategy.ts
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   ├── users.controller.ts
│   └── dto/
│       ├── submit-profile.dto.ts
│       └── apply-wholesaler.dto.ts
├── admin/
│   ├── admin.module.ts
│   ├── admin.service.ts
│   ├── admin.controller.ts
│   └── dto/
│       ├── update-user-status.dto.ts
│       └── update-wholesaler-status.dto.ts
├── scheduler/
│   ├── scheduler.module.ts
│   └── scheduler.service.ts
├── providers/
│   ├── email/
│   │   ├── email.interface.ts
│   │   ├── email.module.ts
│   │   ├── mock-email.service.ts
│   │   └── sendgrid-email.service.ts
│   └── sms/
│       ├── sms.interface.ts
│       ├── sms.module.ts
│       ├── mock-sms.service.ts
│       ├── africastalking-sms.service.ts
│       └── twilio-sms.service.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── redis/
│   └── redis.provider.ts
├── cloudinary.service.ts
├── cloudinary.module.ts
├── app.module.ts
└── main.ts
```