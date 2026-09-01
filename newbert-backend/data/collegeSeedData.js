const rajkiyaColleges = require("./upRajkiyaEngineeringColleges");
const normalized = (name) => String(name).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
module.exports = [
  ...rajkiyaColleges,
  ...[
    { collegeId: "biet-jhansi", name: "Bundelkhand Institute of Engineering and Technology, Jhansi", shortName: "BIET Jhansi", abbreviation: "BIET", city: "Jhansi", aliases: ["BIET Jhansi", "Bundelkhand Institute Engineering Technology Jhansi"] },
    { collegeId: "knit-sultanpur", name: "Kamla Nehru Institute of Technology, Sultanpur", shortName: "KNIT Sultanpur", abbreviation: "KNIT", city: "Sultanpur", aliases: ["KNIT Sultanpur", "Kamla Nehru Institute Technology Sultanpur"] },
    { collegeId: "uptti-kanpur", name: "Uttar Pradesh Textile Technology Institute, Kanpur", shortName: "UPTTI Kanpur", abbreviation: "UPTTI", city: "Kanpur", aliases: ["UPTTI Kanpur", "UP Textile Technology Institute Kanpur"] },
    { collegeId: "iet-lucknow", name: "Institute of Engineering and Technology, Lucknow", shortName: "IET Lucknow", abbreviation: "IET", city: "Lucknow", aliases: ["IET Lucknow", "Institute of Engineering Technology Lucknow"] },
    { collegeId: "mmmut-gorakhpur", name: "Madan Mohan Malaviya University of Technology, Gorakhpur", shortName: "MMMUT Gorakhpur", abbreviation: "MMMUT", city: "Gorakhpur", university: "Madan Mohan Malaviya University of Technology", collegeType: "State Technical University", aliases: ["MMMUT Gorakhpur", "Madan Mohan Malviya University Gorakhpur"] },
    { collegeId: "hbtu-kanpur", name: "Harcourt Butler Technical University, Kanpur", shortName: "HBTU Kanpur", abbreviation: "HBTU", city: "Kanpur", university: "Harcourt Butler Technical University", collegeType: "State Technical University", aliases: ["HBTU Kanpur", "Harcourt Butler University Kanpur"] },
  ].map((college) => ({ district: college.city, state: "Uttar Pradesh", stateCode: "UP", country: "India", university: "Dr. A.P.J. Abdul Kalam Technical University", collegeType: "Government Engineering College", courses: ["B.Tech", "M.Tech"], isActive: true, active: true, metadata: { source: "Newbert maintained seed", verified: true }, ...college, normalizedName: normalized(college.name) })),
];
