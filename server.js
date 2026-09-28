const express = require("express");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("🎯 Delina Bingo server is working!");
});

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        message: "Delina Bingo is online"
    });
});

app.listen(PORT, () => {
    console.log(`Delina Bingo running on port ${PORT}`);
});
