const express = require("express");
const app = express();
const User = require("./models/User"); // Make sure User.js exists in models

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Backend running");
});

// Example: get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = app;