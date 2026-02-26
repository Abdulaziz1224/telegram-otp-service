import { Telegraf } from "telegraf";
import { prisma } from "./store";

export let bot: Telegraf | null = null;

export const initBot = () => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn("Warning: TELEGRAM_BOT_TOKEN is not set in environment.");
    return;
  }

  bot = new Telegraf(botToken);

  bot.start(async (ctx) => {
    const commandWords = ctx.message.text.split(" ");
    const token = commandWords.length > 1 ? commandWords[1] : null;

    if (!token) {
      return ctx.reply(
        "Xush kelibsiz! Iltimos, xizmat tomonidan berilgan tasdiqlash havolasidan foydalaning.",
      );
    }

    try {
      const request = await prisma.oTPRequest.findUnique({ where: { token } });
      if (!request) {
        return ctx.reply("Havola noto'g'ri yoki muddati tugagan.");
      }

      if (request.verified) {
        return ctx.reply("Bu havola allaqachon tasdiqlangan.");
      }

      const userId = ctx.from.id;

      await prisma.userToken.upsert({
        where: { userId: BigInt(userId) },
        update: { token },
        create: { userId: BigInt(userId), token },
      });

      return ctx.reply(
        "Salom! Telefon raqamingizni tasdiqlash uchun quyidagi tugmani bosib kontaktingizni ulashing.",
        {
          reply_markup: {
            keyboard: [
              [
                {
                  text: "📱 Kontaktni ulashish",
                  request_contact: true,
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
    } catch (err) {
      console.error(err);
      return ctx.reply(
        "Tasdiqlashni boshlashda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
      );
    }
  });

  bot.on("contact", async (ctx) => {
    const contact = ctx.message.contact;
    const userId = ctx.from.id;

    if (contact.user_id && contact.user_id !== userId) {
      return ctx.reply(
        "Iltimos, faqat o'z kontaktingizni quyidagi tugma orqali ulashing.",
        {
          reply_markup: {
            keyboard: [
              [{ text: "📱 Kontaktni ulashish", request_contact: true }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
    }

    try {
      const userTokenRow = await prisma.userToken.findUnique({
        where: { userId: BigInt(userId) },
      });
      const token = userTokenRow?.token;

      if (!token) {
        return ctx.reply(
          "Faol tasdiqlash jarayoni topilmadi. Iltimos, xizmat havolasidan qaytadan boshlang.",
          { reply_markup: { remove_keyboard: true } },
        );
      }

      const request = await prisma.oTPRequest.findUnique({ where: { token } });
      if (!request) {
        return ctx.reply("Tasdiqlash havolasining muddati tugagan.", {
          reply_markup: { remove_keyboard: true },
        });
      }

      const sanitizePhone = (phone: string) => phone.replace(/\D/g, "");
      const userPhone = sanitizePhone(contact.phone_number);
      const requestedPhone = sanitizePhone(request.requestedPhoneNumber);

      if (userPhone === requestedPhone) {
        const otpCode = Math.floor(10000 + Math.random() * 90000).toString();

        await prisma.oTPRequest.update({
          where: { token },
          data: {
            verified: true,
            otpCode,
            telegramUserId: BigInt(userId),
          },
        });

        // Persist verified user for future direct OTP delivery
        await prisma.verifiedUser.upsert({
          where: { phoneNumber: request.requestedPhoneNumber },
          update: { telegramUserId: BigInt(userId) },
          create: {
            phoneNumber: request.requestedPhoneNumber,
            telegramUserId: BigInt(userId),
          },
        });

        await prisma.userToken.delete({ where: { userId: BigInt(userId) } });

        return ctx.reply(
          `✅ Telefon raqamingiz muvaffaqiyatli tasdiqlandi!\n\nSizning bir martalik kodingiz: *${otpCode}*\n\nBu kodni xizmatga kiriting.`,
          {
            parse_mode: "Markdown",
            reply_markup: { remove_keyboard: true },
          },
        );
      } else {
        return ctx.reply(
          `❌ Telefon raqami mos kelmadi.\nKutilgan: ${request.requestedPhoneNumber}\nUlashilgan: ${contact.phone_number}\n\nIltimos, so'ralgan raqamga mos kontaktni ulashing.`,
          { reply_markup: { remove_keyboard: true } },
        );
      }
    } catch (err) {
      console.error(err);
      return ctx.reply(
        "Kontaktni qayta ishlashda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
      );
    }
  });
};
