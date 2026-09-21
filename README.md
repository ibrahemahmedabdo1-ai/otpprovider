# OTPProvider FINAL

Next.js 14 + Prisma/PostgreSQL customer/admin portal with RBAC, tickets, health center, API key hashing, OTP send/verify endpoints, credit accounting, and official provider integrations.

## Environment
DATABASE_URL, AUTH_SECRET, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD are required. For live delivery configure TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM and/or RESEND_API_KEY/RESEND_FROM_EMAIL.

## Deploy
`npm install` then `npm run build`, then `npm start`. The build runs Prisma generate/db push/seed.

## API
POST /api/v1/otp/send
POST /api/v1/otp/verify
Use Authorization: Bearer otp_live_... or x-api-key.

WhatsApp uses the official Twilio WhatsApp API. Personal linked-device QR sessions require a separate persistent worker and are not claimed as supported by this Vercel package.
