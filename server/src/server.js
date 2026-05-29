const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();

// ── MIDDLEWARE ─────────────────────────
app.use(cors());
app.use(express.json());

// ── HEALTH CHECK ────────────────────────
app.get("/api/ping", (req, res) => {
  res.send("server is alive");
});

// ── API ROUTES ──────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// ── CONNECT DB + START SERVER ───────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB error:", err);
  });