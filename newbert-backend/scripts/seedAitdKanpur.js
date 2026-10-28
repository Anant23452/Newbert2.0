require("dotenv").config();
const mongoose = require("mongoose");
const College = require("../Models/College");
const connectDatabase = require("../config/db");

(async () => {
  try {
    await connectDatabase();
    const college = require("../data/collegeSeedData").find((item) => item.collegeId === "aitd-kanpur");
    await College.updateOne({ collegeId: college.collegeId }, { $set: college }, { upsert: true, runValidators: true });
    console.log("AITD Kanpur college record saved.");
  } catch (error) {
    console.error(`College seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
