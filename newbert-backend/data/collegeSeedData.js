const rajkiyaColleges = require("./upRajkiyaEngineeringColleges");
const normalized = (name) => String(name).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
module.exports = [
  ...rajkiyaColleges,
  ...[
    { collegeId: "biet-jhansi", name: "Bundelkhand Institute of Engineering and Technology, Jhansi", shortName: "BIET Jhansi", city: "Jhansi", aliases: ["BIET Jhansi", "Bundelkhand Institute Engineering Technology Jhansi"] },
    { collegeId: "knit-sultanpur", name: "Kamla Nehru Institute of Technology, Sultanpur", shortName: "KNIT Sultanpur", city: "Sultanpur", aliases: ["KNIT Sultanpur", "Kamla Nehru Institute Technology Sultanpur"] },
    { collegeId: "uptti-kanpur", name: "Uttar Pradesh Textile Technology Institute, Kanpur", shortName: "UPTTI Kanpur", city: "Kanpur", aliases: ["UPTTI Kanpur", "UP Textile Technology Institute Kanpur"] },
  ].map((college) => ({ ...college, normalizedName: normalized(college.name), district: college.city, state: "Uttar Pradesh", stateCode: "UP", country: "India", university: "Dr. A.P.J. Abdul Kalam Technical University", collegeType: "Government Engineering College", courses: ["B.Tech", "M.Tech"], isActive: true, active: true, metadata: { source: "Newbert maintained seed", verified: true } })),
];
