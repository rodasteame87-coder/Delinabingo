const express = require("express");
const path = require("path");
require("./bot");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Serve the Mini App from the public folder
app.use(express.static(path.join(__dirname, "public")));

// Main Mini App
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health check
app.get("/health", (req, res) => {
    res.json({
        ok: true,
        message: "Delina Bingo is online"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎯 Delina Bingo running on port ${PORT}`);
});
