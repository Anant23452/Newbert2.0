require("dotenv").config();

const mongoose = require("mongoose");
const connectDatabase = require("../config/db");
const Alumni = require("../Models/Alumni");
const Profile = require("../Models/Profile");
const { findCollegeByIdentifier, matchCollege } = require("../services/collegeService");

async function resolveRecord(record) {
  const identified = await findCollegeByIdentifier(record.collegeRef || record.collegeId);
  if (identified) return { status: "resolved", college: identified };
  return matchCollege(record.collegeName || record.college);
}

async function migrateCollection(Model, label) {
  const records = await Model.find({
    college: { $type: "string", $ne: "" },
    $or: [
      { collegeRef: null },
      { collegeRef: { $exists: false } },
      { collegeId: null },
      { collegeId: { $exists: false } },
    ],
  }).lean();

  const result = { label, scanned: records.length, resolved: 0, ambiguous: 0, unresolved: 0 };

  for (const record of records) {
    const resolution = await resolveRecord(record);
    if (resolution.status !== "resolved" || !resolution.college) {
      result[resolution.status === "ambiguous" ? "ambiguous" : "unresolved"] += 1;
      continue;
    }

    const college = resolution.college;
    await Model.updateOne(
      { _id: record._id },
      {
        $set: {
          collegeRef: college._id,
          collegeId: college.collegeId,
          collegeName: college.name,
          college: college.name,
        },
      },
    );
    result.resolved += 1;
  }

  return result;
}

async function migrateCollegeReferences() {
  await connectDatabase();
  const results = [
    await migrateCollection(Profile, "Profiles"),
    await migrateCollection(Alumni, "Alumni"),
  ];

  for (const result of results) {
    console.log(`${result.label} scanned: ${result.scanned}`);
    console.log(`  resolved: ${result.resolved}`);
    console.log(`  ambiguous: ${result.ambiguous}`);
    console.log(`  unresolved: ${result.unresolved}`);
  }

  return results;
}

if (require.main === module) {
  migrateCollegeReferences()
    .then(() => mongoose.disconnect())
    .catch(async (error) => {
      console.error(`College reference migration failed: ${error.message}`);
      await mongoose.disconnect();
      process.exitCode = 1;
    });
}

module.exports = { migrateCollection, migrateCollegeReferences, resolveRecord };
