const mongoose = require("mongoose");
uri = "mongodb+srv://hafiz:hello123@cluster0.y0q6feb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(uri);
    console.log(" MongoDB Connected: Database is connected successfully");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

