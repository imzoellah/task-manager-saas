const Task = require("../models/Task");

// CREATE TASK
exports.createTask = async (req, res) => {
  try {
    const { title } = req.body;

    const task = await Task.create({
      title,
      user: req.user.id,
    });

    res.json(task);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
// GET TASKS
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      user: req.user.id,
    });

    res.json(tasks);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// DELETE TASK
exports.deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);

    res.json({
      message: "Task deleted",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};