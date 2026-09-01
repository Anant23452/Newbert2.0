require("dotenv").config();
const connectDatabase = require("../config/db");
const Alumni = require("../Models/Alumni");

async function removeDemoRoadmapAlumni() {
  await connectDatabase();
  console.log("Safely removing demo roadmap alumni...");
  
  // Strict safety check: delete only records with isDemo === true or isDummyData === true having a demo- prefix
  const result = await Alumni.deleteMany({
    $or: [
      { isDemo: true, demoKey: { $regex: /^demo-/ } },
      { isDummyData: true, dummyKey: { $regex: /^demo-/ } },
    ],
  });

  console.log(`Deleted ${result.deletedCount} demo roadmap alumni.`);
  process.exit(0);
}

removeDemoRoadmapAlumni().catch((err) => {
  console.error("Error removing demo roadmap alumni:", err);
  process.exit(1);
});
