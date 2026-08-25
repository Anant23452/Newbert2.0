const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDatabase = require("./config/db");

dotenv.config();
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing. Add it to newbert-backend/.env.");
  process.exit(1);
}
const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://newbert.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/profiles", require("./routes/profileRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/alumni", require("./routes/alumniRoutes"));
app.use("/api/plans", require("./routes/planRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use((error, req, res, next) => { console.error(error); res.status(error.status || 500).json({ message: error.status ? error.message : "Something went wrong on the server." }); });

const port = Number(process.env.PORT) || 5000;
connectDatabase().then(() => app.listen(port, () => console.log(`Newbert API running on port ${port}`))).catch((error) => { console.error("Database connection failed:", error.message); process.exit(1); });
