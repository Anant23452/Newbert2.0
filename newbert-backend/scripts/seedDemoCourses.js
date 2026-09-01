require("dotenv").config();
const connectDatabase = require("../config/db");
const Course = require("../Models/Course");
const { demoCourseFixtures } = require("../data/demoCourseFixtures");

async function seedDemoCourses() {
  await connectDatabase();
  console.log("Seeding demo courses...");
  let upsertedCount = 0;
  for (const fixture of demoCourseFixtures) {
    const filter = fixture.demoKey ? { demoKey: fixture.demoKey } : { url: fixture.url };
    const payload = {
      ...fixture,
      isDemo: true,
      source: { type: "demo-seed", officialUrl: fixture.url, addedBy: "demo-system" },
      active: true,
    };
    await Course.updateOne(filter, { $set: payload }, { upsert: true });
    upsertedCount++;
  }
  console.log(`Successfully seeded/updated ${upsertedCount} demo courses.`);
  process.exit(0);
}

seedDemoCourses().catch((err) => {
  console.error("Error seeding demo courses:", err);
  process.exit(1);
});
