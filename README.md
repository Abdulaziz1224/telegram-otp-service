# Telegram OTP Verification Service

[![CI](https://github.com/Abdulaziz1224/telegram-otp-service/actions/workflows/ci.yml/badge.svg)](https://github.com/Abdulaziz1224/telegram-otp-service/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

This is a Node.js service that provides an API for third-party services to authenticate users via Telegram by verifying their phone numbers.

## Flow

```mermaid
sequenceDiagram
    participant App as Third-party app
    participant API as OTP Service
    participant TG as Telegram bot
    participant User

    App->>API: POST /api/requests { phoneNumber }
    API-->>App: { token, url: t.me/bot?start=token }
    App->>User: show Telegram link
    User->>TG: /start token
    TG->>User: request contact
    User->>TG: share contact
    TG->>API: verify number matches
    App->>API: GET /api/requests/:token
    API-->>App: { verified: true, telegramUserId }
```

1. A third-party service sends a request to this API with the user's phone number.
2. This API generates a one-time token and returns a Telegram bot link (e.g., `https://t.me/your_bot?start=token`).
3. The user clicks the link, opens Telegram, and clicks "Start".
4. The bot prompts the user to share their contact information.
5. Once the user shares their contact, the bot verifies that the shared phone number matches the requested phone number.
6. The third-party service can poll or check the status of the verification using the token.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- A Telegram Bot Token. You can get one by talking to [@BotFather](https://t.me/BotFather) on Telegram.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from the example:

   ```bash
   cp .env.example .env
   ```

3. Open `.env` and fill in your Telegram Bot Token and Database connection string:

   ```
   TELEGRAM_BOT_TOKEN=your_token_from_botfather
   PORT=3000
   DATABASE_URL="postgresql://user:password@localhost:5432/telegram_otp?schema=public"
   ```

4. Initialize your database by pushing the Prisma schema:
   ```bash
   npx prisma db push
   ```

## Running the Service

For development (auto-restarts on changes):

```bash
npm run dev
```

For production:

```bash
npm run build
npm start
```

## API Endpoints

### 1. Create a Verfication Request

**POST** `/api/requests`

**Request Body:**

```json
{
  "phoneNumber": "1234567890" // Include country code, numbers only
}
```

**Response:**

```json
{
  "token": "a1b2c3d4e5f6...",
  "url": "https://t.me/YourBotName?start=a1b2c3d4e5f6..."
}
```

### 2. Check Verification Status

**GET** `/api/requests/:token`

**Response (Pending):**

```json
{
  "token": "a1b2c3d4e5f6...",
  "requestedPhoneNumber": "1234567890",
  "verified": false,
  "createdAt": 1716300000000
}
```

**Response (Verified):**

```json
{
  "token": "a1b2c3d4e5f6...",
  "requestedPhoneNumber": "1234567890",
  "verified": true,
  "telegramUserId": 987654321,
  "createdAt": 1716300000000
}
```
