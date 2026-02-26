import dotenv from "dotenv";
dotenv.config();

import app, { setBotUsername, setBotSendMessage } from "./api";
import { bot, initBot } from "./telegram";

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  initBot();

  if (bot) {
    try {
      const botInfo = await bot.telegram.getMe();
      setBotUsername(botInfo.username);
      console.log(`Bot username configured: @${botInfo.username}`);
    } catch (e) {
      console.error("Failed to get bot info:", e);
    }

    // Expose a send-message helper so the API can push OTPs directly
    setBotSendMessage(async (chatId, text) => {
      await bot!.telegram.sendMessage(chatId, text, { parse_mode: "Markdown" });
    });

    // Launch polling in background — do NOT await, it resolves only when bot stops
    bot.launch({ dropPendingUpdates: true }).catch((e) => {
      console.error("Bot polling error:", e);
    });

    console.log("Bot is running");
  } else {
    console.log("Bot is not initialized. Setup TELEGRAM_BOT_TOKEN.");
  }

  app.listen(PORT, () => {
    console.log(`API Service is running on http://localhost:${PORT}`);
  });

  process.once("SIGINT", () => bot?.stop("SIGINT"));
  process.once("SIGTERM", () => bot?.stop("SIGTERM"));
}

bootstrap();
