const express = require("express");
const path = require("path");

const { announceNumber, announceWinner, startBot } = require("./bot");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =========================
// GAME DATA
// =========================

const game = {
  running: false,
  called: [],
  players: {},
  winners: [],
};

// =========================
// HELPERS
// =========================

// Fair shuffle (Fisher-Yates)
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function pickNumbers(start, end) {
  const numbers = [];
  for (let i = start; i <= end; i++) numbers.push(i);
  return shuffle(numbers).slice(0, 5);
}

function createCard() {
  const B = pickNumbers(1, 15);
  const I = pickNumbers(16, 30);
  const N = pickNumbers(31, 45);
  const G = pickNumbers(46, 60);
  const O = pickNumbers(61, 75);

  const card = [];
  for (let row = 0; row < 5; row++) {
    card.push([B[row], I[row], N[row], G[row], O[row]]);
  }
  card[2][2] = "FREE";
  return card;
}

function isAdmin(req) {
  const userId = String((req.body && req.body.user_id) || "");
  const adminId = String(process.env.ADMIN_ID || "");
  return adminId !== "" && userId === adminId;
}

function hasBingo(card, marked) {
  const set = new Set(marked.map(String));
  const has = (r, c) => set.has(String(card[r][c]));

  for (let i = 0; i < 5; i++) {
    let rowOk = true;
    let colOk = true;
    for (let j = 0; j < 5; j++) {
      if (!has(i, j)) rowOk = false;
      if (!has(j, i)) colOk = false;
    }
    if (rowOk || colOk) return true;
  }

  let d1 = true;
  let d2 = true;
  for (let i = 0; i < 5; i++) {
    if (!has(i, i)) d1 = false;
    if (!has(i, 4 - i)) d2 = false;
  }
  return d1 || d2;
}

// =========================
// PAGES
// =========================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Delina Bingo is online" });
});

// =========================
// GAME STATE
// =========================

app.get("/api/state", (req, res) => {
  res.json({
    running: game.running,
    called: game.called,
    players: Object.keys(game.players).length,
    winners: game.winners,
  });
});

// =========================
// JOIN
// =========================

app.post("/api/join", (req, res) => {
  const userId = String(req.body.user_id || "");
  const name = String(req.body.name || "Player").slice(0, 40);

  if (!userId) {
    return res.status(400).json({ ok: false, error: "User ID missing" });
  }

  if (!game.players[userId]) {
    game.players[userId] = {
      name,
      card: createCard(),
      marked: ["FREE"],
    };
  }

  const player = game.players[userId];
  res.json({
    ok: true,
    name: player.name,
    card: player.card,
    marked: player.marked,
  });
});

// =========================
// MARK NUMBER
// =========================

app.post("/api/mark", (req, res) => {
  const userId = String(req.body.user_id || "");
  const number = req.body.number;
  const player = game.players[userId];

  if (!player) {
    return res.status(404).json({ ok: false, error: "Player not found" });
  }
  if (!game.running) {
    return res.json({ ok: false, error: "Game is not running" });
  }

  if (number !== "FREE") {
    const num = Number(number);

    if (!game.called.includes(num)) {
      return res.json({ ok: false, error: "Number has not been called" });
    }

    const onCard = player.card.some((row) => row.includes(num));
    if (!onCard) {
      return res.json({ ok: false, error: "Number is not on your card" });
    }

    if (!player.marked.includes(num)) player.marked.push(num);
  }

  res.json({ ok: true, marked: player.marked });
});

// =========================
// CLAIM BINGO
// =========================

app.post("/api/claim", async (req, res) => {
  const userId = String(req.body.user_id || "");
  const player = game.players[userId];

  if (!player) {
    return res.json({ ok: false, error: "Player not found" });
  if (hasBingo(player.card, player.marked)) {
    if (!game.winners.includes(userId)) game.winners.push(userId);
    game.running = false;

    console.log(`🏆 BINGO WINNER: ${player.name}`);

    // Do not make the player wait for all messages to be sent
    announceWinner(player.name, game.players).catch((e) =>
      console.error("announceWinner error:", e.message)
    );

    return res.json({ ok: true, winner: true, name: player.name });
  }

  res.json({ ok: true, winner: false });
});

// =========================
// ADMIN
// =========================

app.post("/api/admin/start", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ ok: false, error: "Not allowed" });
  }

  game.running = true;
  game.called = [];
  game.winners = [];

  // Give everyone a fresh card
  for (const id of Object.keys(game.players)) {
    game.players[id].card = createCard();
    game.players[id].marked = ["FREE"];
  }

  res.json({ ok: true, running: true });
});

app.post("/api/admin/call", async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ ok: false, error: "Not allowed" });
  }
  if (!game.running) {
    return res.json({ ok: false, error: "Game is not running" });
  }

  const remaining = [];
  for (let n = 1; n <= 75; n++) {
    if (!game.called.includes(n)) remaining.push(n);
  }

  if (remaining.length === 0) {
    return res.json({ ok: false, error: "All numbers have been called" });
  }

  const number = remaining[Math.floor(Math.random() * remaining.length)];
  game.called.push(number);

  // Telegram messages per number are off by default (spammy + rate limits).
  // Set NOTIFY_NUMBERS=true in Render to turn them on.
  if (process.env.NOTIFY_NUMBERS === "true") {
    announceNumber(number, game.players).catch((e) =>
      console.error("announceNumber error:", e.message)
    );
  }

  res.json({ ok: true, number, called: game.called });
});

app.post("/api/admin/reset", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ ok: false, error: "Not allowed" });
  }

  game.running = false;
  game.called = [];
  game.players = {};
  game.winners = [];

  res.json({ ok: true });
});

// =========================
// START SERVER + BOT
// =========================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  startBot();
});
