const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const appUrl = process.env.APP_URL;

if (!token) {
    console.error("BOT_TOKEN is missing");
    process.exit(1);
}

if (!appUrl) {
    console.error("APP_URL is missing");
    process.exit(1);
}

const bot = new TelegramBot(token, {
    polling: true
});

bot.onText(/\/start/, async (msg) => {

    const chatId = msg.chat.id;

    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: "🎯 Open Delina Bingo",
                    web_app: {
                        url: appUrl
                    }
                }
            ]
        ]
    };

    await bot.sendMessage(
        chatId,
        "🎯 Welcome to Delina Bingo!\n\nTap the button below to enter the game.",
        {
            reply_markup: keyboard
        }
    );
});

bot.onText(/\/ping/, async (msg) => {
    await bot.sendMessage(
        msg.chat.id,
        "🟢 Delina Bingo bot is working!"
    );
});

console.log("🤖 Delina Bingo Telegram bot is running");
