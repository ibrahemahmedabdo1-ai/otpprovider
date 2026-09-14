# OTPProvider Enterprise

Professional SaaS platform for sending and verifying OTP via WhatsApp and Email.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma + PostgreSQL (Neon)
- NextAuth v5
- Tailwind CSS + next-themes (Light / Dark / System)
- Zod, bcryptjs, Lucide

## Quick Start

### 1. Environment

cp .env.example .env

Fill:
DATABASE_URL=postgresql://...   # Neon
NEXTAUTH_SECRET=long-random-string
NEXTAUTH_URL=http://localhost:3000

### 2. Install & DB

npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
npm run db:seed

### 3. Run

npm run dev

### Default Accounts (seed)

SUPER_ADMIN: admin@otpprovider.com / Admin@123456
CUSTOMER: customer@example.com / Customer@123

## Production

npm run build
npm start

## Deploy

GitHub + Vercel + Neon. Set env vars on Vercel.

## API

POST /api/v1/otp/send
POST /api/v1/otp/verify
GET  /api/v1/otp/status

Header: x-api-key

See /docs/api
