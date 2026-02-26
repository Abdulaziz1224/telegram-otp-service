import express from "express";
import cors from "cors";
import crypto from "crypto";
import { prisma } from "./store";

const app = express();
app.use(express.json());
app.use(cors());

let botUsernameCache = "";
let botSendMessageFn: ((chatId: number, text: string) => Promise<void>) | null =
  null;

export const setBotUsername = (username: string) => {
  botUsernameCache = username;
};

export const setBotSendMessage = (
  fn: (chatId: number, text: string) => Promise<void>,
) => {
  botSendMessageFn = fn;
};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/requests", async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      error:
        "phoneNumber is required. Include country code without letters/symbols.",
    });
  }

  const token = crypto.randomBytes(16).toString("hex");

  try {
    // Check if this phone number has been verified before
    const knownUser = await prisma.verifiedUser.findUnique({
      where: { phoneNumber },
    });

    if (knownUser && botSendMessageFn) {
      // Generate OTP immediately and send directly via Telegram
      const otpCode = Math.floor(10000 + Math.random() * 90000).toString();

      await prisma.oTPRequest.create({
        data: {
          token,
          requestedPhoneNumber: phoneNumber,
          verified: true,
          otpCode,
          telegramUserId: knownUser.telegramUserId,
        },
      });

      await botSendMessageFn(
        Number(knownUser.telegramUserId),
        `🔐 Sizning bir martalik tasdiqlash kodingiz: *${otpCode}*\n\nBu kod faqat bir marta ishlatilishi mumkin.`,
      );

      return res.json({
        token,
        sentDirectly: true,
        message: "OTP sent directly to the user via Telegram.",
      });
    }

    // Unknown user — create request and return the Telegram link
    await prisma.oTPRequest.create({
      data: {
        token,
        requestedPhoneNumber: phoneNumber,
        verified: false,
      },
    });

    if (!botUsernameCache) {
      return res.status(500).json({
        error: "Bot username is not configured.",
      });
    }

    const url = `https://t.me/${botUsernameCache}?start=${token}`;
    return res.json({ token, sentDirectly: false, url });
  } catch (error) {
    console.error("Failed to create OTP request:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/requests/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const request = await prisma.oTPRequest.findUnique({ where: { token } });

    if (!request) {
      return res.status(404).json({ error: "Request not found or expired" });
    }

    res.json({
      token: request.token,
      requestedPhoneNumber: request.requestedPhoneNumber,
      verified: request.verified,
      otpCode: request.otpCode,
      telegramUserId: request.telegramUserId
        ? request.telegramUserId.toString()
        : null,
      createdAt: request.createdAt,
    });
  } catch (error) {
    console.error("Failed to get OTP request:", error);
    return res.status(500).json({ error: "Database error" });
  }
});

export default app;
