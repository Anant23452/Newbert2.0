const dotenv = require("dotenv"); const mongoose = require("mongoose"); const Alumni = require("../Models/Alumni");
dotenv.config();
function assertDummyAllowed() { if (process.env.NODE_ENV === "production" || String(process.env.ALLOW_DUMMY_ALUMNI).toLowerCase() !== "true") throw new Error("Dummy alumni removal is disabled. Set ALLOW_DUMMY_ALUMNI=true in a non-production environment."); }
async function clearDummyAlumni() { assertDummyAllowed(); await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "newbert" }); return Alumni.deleteMany({ isDummyData: true }); }
if (require.main === module) clearDummyAlumni().then((result) => { console.log(`Removed ${result.deletedCount} dummy alumni profiles.`); return mongoose.disconnect(); }).catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exit(1); });
module.exports = { assertDummyAllowed, clearDummyAlumni };

