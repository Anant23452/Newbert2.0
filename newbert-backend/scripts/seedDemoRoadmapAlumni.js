require("dotenv").config();
const connectDatabase = require("../config/db");
const Alumni = require("../Models/Alumni");
const { demoRoadmapAlumniFixtures } = require("../data/demoRoadmapAlumniFixtures");

async function seedDemoRoadmapAlumni() {
  await connectDatabase();
  console.log("Seeding demo roadmap alumni fixtures...");
  let count = 0;

  for (const fixture of demoRoadmapAlumniFixtures) {
    const filter = { demoKey: fixture.demoKey };
    const payload = {
      ...fixture,
      batch: fixture.graduationYear || 2025,
      dummyKey: fixture.demoKey,
      isDemo: true,
      isDummyData: true,
      verified: true,
      careerPaths: [fixture.outcomeType || "placement"],
      placement: {
        company: fixture.company,
        role: fixture.role,
        packageLpa: fixture.package,
        year: fixture.graduationYear || 2025,
      },
      placementOutcome: {
        company: fixture.company,
        role: fixture.role,
        packageLpa: fixture.package,
        placementYear: fixture.graduationYear || 2025,
      },
      placementPreparation: {
        preparationMonths: fixture.preparationStrategy?.durationMonths || 9,
        averageHoursPerDay: Math.round((fixture.preparationStrategy?.hoursPerWeek || 15) / 5),
        preparationPhases: (fixture.preparationStrategy?.phases || []).map((p, idx) => ({
          title: p.phase,
          order: idx + 1,
          duration: p.duration,
          description: p.focus,
        })),
      },
      dsa: {
        solved: fixture.leetcodeStats?.totalSolved || 0,
        strongTopics: ["Arrays", "Trees", "Graphs", "DP"],
      },
      github: {
        publicRepos: fixture.githubStats?.publicRepos || 0,
      },
      projectsDetail: fixture.projectDetails || [],
      mentorshipEnabled: Boolean(fixture.mentorship?.available),
      availableTopics: fixture.mentorship?.topics || [],
      privacy: { profile: true, academics: true, preparation: true, courses: true, advice: true, mentorship: true },
    };

    await Alumni.updateOne(filter, { $set: payload }, { upsert: true });
    count++;
  }

  console.log(`Successfully seeded/updated ${count} demo roadmap alumni.`);
  process.exit(0);
}

seedDemoRoadmapAlumni().catch((err) => {
  console.error("Error seeding demo roadmap alumni:", err);
  process.exit(1);
});
