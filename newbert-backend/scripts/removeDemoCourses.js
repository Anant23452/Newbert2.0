require("dotenv").config();
const connectDatabase = require("../config/db");
const Course = require("../Models/Course");

async function removeDemoCourses() {
  await connectDatabase();
  console.log("Removing demo courses (isDemo: true)...");
  const result = await Course.deleteMany({ isDemo: true });
  console.log(`Safely deleted ${result.deletedCount} demo courses. Real courses were preserved.`);
  process.exit(0);
}

removeDemoCourses().catch((err) => {
  console.error("Error removing demo courses:", err);
  process.exit(1);
});
