require("dotenv").config(); const connectDatabase = require("../config/db"); const College = require("../Models/College"); const colleges = require("../data/collegeSeedData");
async function run() { await connectDatabase(); for (const college of colleges) await College.updateOne({ collegeId: college.collegeId }, { $set: college }, { upsert: true, runValidators: true }); console.log(`Colleges seeded: ${colleges.length}`); process.exit(0); }
run().catch((error) => { console.error(`College seed failed: ${error.message}`); process.exit(1); });
