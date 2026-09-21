# OTPProvider API Quick Start

## Authentication
Send the API key as:
`Authorization: Bearer otp_live_xxx`

or:
`x-api-key: otp_live_xxx`

## Send OTP
`POST /api/v1/otp/send`

JSON:
`{"channel":"whatsapp","recipient":"+2010...","country":"EG"}`

or email:
`{"channel":"email","recipient":"customer@example.com","country":"EG"}`

Response contains `verificationId`, `status`, `expiresAt`, and `creditsCharged`.

## Verify OTP
`POST /api/v1/otp/verify`

JSON:
`{"verificationId":"...","code":"123456"}`

## Account API key
Authenticated browser session can call `POST /api/account/keys` with `{ "mode":"live", "name":"Production" }` after the account has production credits. The raw key is returned once only.
