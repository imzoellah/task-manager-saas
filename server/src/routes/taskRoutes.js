const express = require("express");
const router = express.Router();

const {
  createTask,
  getTasks,
  deleteTask,
} = require("../controllers/taskController");

const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, createTask);
router.get("/", authMiddleware, getTasks);
router.delete("/:id", authMiddleware, deleteTask);

module.exports = router;