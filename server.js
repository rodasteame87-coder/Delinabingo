const express = require("express");
const path = require("path");

const { announceNumber } = require("./bot");

const app = express();

const PORT =
    process.env.PORT || 10000;

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// =========================
// GAME DATA
// =========================

const game = {

    running: false,

    called: [],

    players: {},

    winners: []

};


// =========================
// BINGO CARD
// =========================

function shuffle(array) {

    return array.sort(
        () => Math.random() - 0.5
    );

}


function pickNumbers(start, end) {

    const numbers = [];

    for (
        let i = start;
        i <= end;
        i++
    ) {

        numbers.push(i);

    }

    return shuffle(numbers).slice(0, 5);

}


function createCard() {

    const B =
        pickNumbers(1, 15);

    const I =
        pickNumbers(16, 30);

    const N =
        pickNumbers(31, 45);

    const G =
        pickNumbers(46, 60);

    const O =
        pickNumbers(61, 75);


    const card = [];


    for (
        let row = 0;
        row < 5;
        row++
    ) {

        card.push([

            B[row],

            I[row],

            N[row],

            G[row],

            O[row]

        ]);

    }


    card[2][2] = "FREE";


    return card;

}


// =========================
// ADMIN SECURITY
// =========================

function isAdmin(req) {

    const userId =
        String(
            req.body.user_id || ""
        );

    const adminId =
        String(
            process.env.ADMIN_ID || ""
        );

    return userId === adminId;

}


// =========================
// HOME
// =========================

app.get("/", (req, res) => {

    res.sendFile(

        path.join(
            __dirname,
            "public",
            "index.html"
        )

    );

});


// =========================
// HEALTH
// =========================

app.get("/health", (req, res) => {

    res.json({

        ok: true,

        message:
            "Delina Bingo is online"

    });

});


// =========================
// GAME STATE
// =========================

app.get("/api/state", (req, res) => {

    res.json({

        running:
            game.running,

        called:
            game.called,

        players:
            Object.keys(
                game.players
            ).length,

        winners:
            game.winners

    });

});


// =========================
// JOIN GAME
// =========================

app.post("/api/join", (req, res) => {

    const userId =
        String(
            req.body.user_id || ""
        );

    const name =
        String(
            req.body.name ||
            "Player"
        );


    if (!userId) {

        return res.status(400).json({

            ok: false,

            error:
                "User ID missing"

        });

    }


    if (!game.players[userId]) {

        game.players[userId] = {

            name: name,

            card:
                createCard(),

            marked:
                ["FREE"]

        };

    }


    const player =
        game.players[userId];


    res.json({

        ok: true,

        name:
            player.name,

        card:
            player.card,

        marked:
            player.marked

    });

});


// =========================
// MARK NUMBER
// =========================

app.post("/api/mark", (req, res) => {

    const userId =
        String(
            req.body.user_id || ""
        );

    const number =
        req.body.number;


    const player =
        game.players[userId];


    if (!player) {

        return res.status(404).json({

            ok: false,

            error:
                "Player not found"

        });

    }


    if (!game.running) {

        return res.json({

            ok: false,

            error:
                "Game is not running"

        });

    }


    if (number !== "FREE") {

        const num =
            Number(number);


        if (
            !game.called.includes(num)
        ) {

            return res.json({

                ok: false,

                error:
                    "Number has not been called"

            });

        }

    }


    if (
        !player.marked.includes(number)
    ) {

        player.marked.push(number);

    }


    res.json({

        ok: true,

        marked:
            player.marked

    });

});


// =========================
// BINGO CHECK
// =========================

function hasBingo(card, marked) {

    const markedSet =
        new Set(
            marked.map(String)
        );


    // ROWS

    for (
        let row = 0;
        row < 5;
        row++
    ) {

        let complete = true;


        for (
            let col = 0;
            col < 5;
            col++
        ) {

            if (
                !markedSet.has(
                    String(
                        card[row][col]
                    )
                )
            ) {

                complete = false;

                break;

            }

        }


        if (complete) {

            return true;

        }

    }


    // COLUMNS

    for (
        let col = 0;
        col < 5;
        col++
    ) {

        let complete = true;


        for (
            let row = 0;
            row < 5;
            row++
        ) {

            if (
                !markedSet.has(
                    String(
                        card[row][col]
                    )
                )
            ) {

                complete = false;

                break;

            }

        }


        if (complete) {

            return true;

        }

    }


    // DIAGONAL 1

    let diagonal1 = true;


    for (
        let i = 0;
        i < 5;
        i++
    ) {

        if (
            !markedSet.has(
                String(
                    card[i][i]
                )
            )
        ) {

            diagonal1 = false;

            break;

        }

    }


    if (diagonal1) {

        return true;

    }


    // DIAGONAL 2

    let diagonal2 = true;


    for (
        let i = 0;
        i < 5;
        i++
    ) {

        if (
            !markedSet.has(
                String(
                    card[i][4 - i]
                )
            )
        ) {

            diagonal2 = false;

            break;

        }

    }


    return diagonal2;

}


// =========================
// CLAIM BINGO
// =========================

app.post("/api/claim", (req, res) => {

    const userId =
        String(
            req.body.user_id || ""
        );


    const player =
        game.players[userId];


    if (!player) {

        return res.json({

            ok: false,

            error:
                "Player not found"

        });

    }


    if (!game.running) {

        return res.json({

            ok: false,

            error:
                "Game is not running"

        });

    }


    if (
        hasBingo(
            player.card,
            player.marked
        )
    ) {

        if (
            !game.winners.includes(
                userId
            )
        ) {

            game.winners.push(
                userId
            );

        }


        return res.json({

            ok: true,

            winner: true,

            name:
                player.name

        });

    }


    res.json({

        ok: true,

        winner: false,

        message:
            "No Bingo yet"

    });

});


// =========================
// ADMIN START
// =========================

app.post(
    "/api/admin/start",
    (req, res) => {

        if (!isAdmin(req)) {

            return res.status(403).json({

                ok: false,

                error:
                    "Admin access required"

            });

        }


        game.running = true;

        game.called = [];

        game.players = {};

        game.winners = [];


        res.json({

            ok: true,

            message:
                "Game started"

        });

    }
);


// =========================
// ADMIN STOP
// =========================

app.post(
    "/api/admin/stop",
    (req, res) => {

        if (!isAdmin(req)) {

            return res.status(403).json({

                ok: false,

                error:
                    "Admin access required"

            });

        }


        game.running = false;


        res.json({

            ok: true,

            message:
                "Game stopped"

        });

    }
);


// =========================
// ADMIN MANUAL CALL
// =========================

app.post(
    "/api/admin/call",
    (req, res) => {

        if (!isAdmin(req)) {

            return res.status(403).json({

                ok: false,

                error:
                    "Admin access required"

            });

        }


        const number =
            Number(req.body.number);


        if (!game.running) {

            return res.json({

                ok: false,

                error:
                    "Game is not running"

            });

        }


        if (
            !Number.isInteger(number) ||
            number < 1 ||
            number > 75
        ) {

            return res.json({

                ok: false,

                error:
                    "Number must be between 1 and 75"

            });

        }


        if (
            game.called.includes(
                number
            )
        ) {

            return res.json({

                ok: false,

                error:
                    "Number already called"

            });

        }


        game.called.push(number);


        announceNumber(
            number,
            game.players
        );


        res.json({

            ok: true,

            number: number,

            called:
                game.called

        });

    }
);


// =========================
// AUTOMATIC NUMBER
// =========================

async function autoCallNumber() {

    if (!game.running) {

        return;

    }


    if (
        game.called.length >= 75
    ) {

        console.log(
            "🎱 All numbers called"
        );

        game.running = false;

        return;

    }


    const available = [];


    for (
        let i = 1;
        i <= 75;
        i++
    ) {

        if (
            !game.called.includes(i)
        ) {

            available.push(i);

        }

    }


    const number =
        available[
            Math.floor(
                Math.random() *
                available.length
            )
        ];


    game.called.push(number);


    console.log(
        "🎱 Auto called:",
        number
    );


    // Send Telegram announcement

    await announceNumber(
        number,
        game.players
    );

}


// Every 10 seconds

setInterval(() => {

    autoCallNumber();

}, 10000);


// =========================
// START SERVER
// =========================

app.listen(
    PORT,
    () => {

        console.log(
            `🎯 Delina Bingo running on port ${PORT}`
        );

    }
);
