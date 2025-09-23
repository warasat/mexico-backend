const User = require("../models/User");

// @desc    Get all users
// @route   GET /api/users
const getUsers = async (req, res) => {
  const users = await User.find();
  res.json(users);
};

// @desc    Create a user
// @route   POST /api/users
const createUser = async (req, res) => {
  const { name, email } = req.body;
  const user = new User({ name, email });
  await user.save();
  res.status(201).json(user);
};

module.exports = { getUsers, createUser };
