require("dotenv").config();
const mongoose = require("mongoose");
const connectDatabase = require("../config/db");
const College = require("../Models/College");
const colleges = require("../data/collegeSeedData");
const rajkiyaColleges = require("../data/upRajkiyaEngineeringColleges");

// Repair only the affected college identities; preserve other records and aliases.
async function fixMitMeerutCollege() {
  const mit = colleges.find((college) => college.collegeId === "mit-meerut");
  await College.updateOne({ collegeId: mit.collegeId }, { $set: mit }, { upsert: true, runValidators: true });
  for (const college of rajkiyaColleges) {
    await College.updateOne(
      { collegeId: college.collegeId },
      { $pull: { aliases: `Meerut Institute of Technology ${college.city}` } },
    );
  }
}

if (require.main === module) {
  (async () => {
    try {
      await connectDatabase();
      await fixMitMeerutCollege();
      console.log("MIT Meerut added; incorrect Rajkiya aliases removed.");
    } catch (error) {
      console.error(`College repair failed: ${error.message}`);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  })();
}

module.exports = { fixMitMeerutCollege };
