const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/act-hr",
      {
        serverSelectionTimeoutMS: 5000, // fail fast if Atlas unreachable
      },
    );
    console.log("mongodb connnected succesfully")
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
