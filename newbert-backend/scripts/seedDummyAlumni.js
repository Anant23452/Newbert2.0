const dotenv = require("dotenv"); const mongoose = require("mongoose"); const Alumni = require("../Models/Alumni"); const { dummyAlumniFixtures } = require("../data/dummyAlumniFixtures");
dotenv.config();
function assertDummyAllowed() { if (process.env.NODE_ENV === "production" || String(process.env.ALLOW_DUMMY_ALUMNI).toLowerCase() !== "true") throw new Error("Dummy alumni are disabled. Set ALLOW_DUMMY_ALUMNI=true in a non-production environment."); }
async function seedDummyAlumni() { assertDummyAllowed(); await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "newbert" }); for (const fixture of dummyAlumniFixtures) await Alumni.findOneAndUpdate({ dummyKey: fixture.dummyKey }, { $set: fixture }, { upsert: true, runValidators: true, setDefaultsOnInsert: true }); return dummyAlumniFixtures.length; }
if (require.main === module) seedDummyAlumni().then((count) => { console.log(`Seeded ${count} dummy alumni profiles.`); return mongoose.disconnect(); }).catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exit(1); });
module.exports = { assertDummyAllowed, seedDummyAlumni };

