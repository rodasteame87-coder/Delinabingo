const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const appUrl = process.env.APP_URL;

if (!token) {

    console.error(
        "❌ BOT_TOKEN is missing"
    );

    process.exit(1);

}

if (!appUrl) {

    console.error(
        "❌ APP_URL is missing"
    );

    process.exit(1);

}


const bot = new TelegramBot(
    token,
    {
        polling: {
            autoStart: false,
            params: {
                timeout: 30
            }
        }
    }
);


// ==========================
// START BOT
// ==========================

async function startBot() {

    try {

        await bot.deleteWebHook({
            drop_pending_updates: true
        });

        console.log(
            "✅ Old Telegram webhook removed"
        );

        await bot.startPolling();

        console.log(
            "🤖 Delina Bingo bot is running"
        );

    } catch (error) {

        console.error(
            "❌ Telegram bot startup error:",
            error.message
        );

    }

}


// ==========================
// START COMMAND
// ==========================

bot.onText(
    /\/start/,
    async (msg) => {

        const chatId =
            msg.chat.id;

        const keyboard = {

            inline_keyboard: [

                [

                    {

                        text:
                            "🎯 Open Delina Bingo",

                        web_app: {

                            url:
                                appUrl +
                                "?v=3"

                        }

                    }

                ]

            ]

        };

        try {

            await bot.sendMessage(

                chatId,

                "🎯 Welcome to Delina Bingo!\n\nTap the button below to enter the game.",

                {
                    reply_markup:
                        keyboard
                }

            );

        } catch (error) {

            console.error(
                "❌ Could not send message:",
                error.message
            );

        }

    }
);


// ==========================
// PING
// ==========================

bot.onText(
    /\/ping/,
    async (msg) => {

        try {

            await bot.sendMessage(

                msg.chat.id,

                "🟢 Delina Bingo bot is working!"

            );

        } catch (error) {

            console.error(
                "❌ Ping error:",
                error.message
            );

        }

    }
);


// ==========================
// NUMBER ANNOUNCEMENT
// ==========================

async function announceNumber(
    number,
    players
) {

    for (
        const userId of
        Object.keys(players)
    ) {

        try {

            await bot.sendMessage(

                userId,

                `🎱 NUMBER CALLED: ${number}\n\nCheck your Delina Bingo card!`

            );

        } catch (error) {

            console.error(

                `❌ Could not notify player ${userId}:`,

                error.message

            );

        }

    }

}


// ==========================
// WINNER ANNOUNCEMENT
// ==========================

async function announceWinner(
    winnerName,
    players
) {

    for (
        const userId of
        Object.keys(players)
    ) {

        try {

            await bot.sendMessage(

                userId,

                `🏆 BINGO!\n\n🎉 ${winnerName} has won the game!\n\n🔴 The game has ended.`

            );

        } catch (error) {

            console.error(

                `❌ Could not notify player ${userId}:`,

                error.message

            );

        }

    }

}


// ==========================
// POLLING ERROR
// ==========================

bot.on(
    "polling_error",
    (error) => {

        console.error(

            "⚠️ Telegram polling error:",

            error.code,

            error.message

        );

    }
);


// ==========================
// EXPORT
// ==========================

module.exports = {

    startBot,

    announceNumber,

    announceWinner

};
