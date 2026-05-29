const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    enum: ["todo", "doing", "done"],
    default: "todo",
  },

  deadline: {
    type: Date,
    default: null,
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = mongoose.model("Task", taskSchema);