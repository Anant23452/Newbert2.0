const university = "Dr. A.P.J. Abdul Kalam Technical University";
const rec = (collegeId, city, aliases = []) => ({
  collegeId, name: `Rajkiya Engineering College, ${city}`, shortName: `REC ${city}`, abbreviation: "REC",
  normalizedName: `rajkiya engineering college ${city.toLowerCase()}`,
  city, district: city, state: "Uttar Pradesh", stateCode: "UP", country: "India", university,
  collegeType: "Government Engineering College", courses: ["B.Tech"],
  aliases: [
    `REC ${city}`,
    `Rajkiya Engineering College ${city}`,
    `Rajkiya Engineering College, (REC), ${city}`,
    `Rajkiya Eng College ${city}`,
    `Government Engineering College ${city}`,
    ...aliases,
  ],
  isActive: true, active: true, metadata: { source: "Newbert maintained seed", verified: true },
});

module.exports = [
  rec("rec-ambedkar-nagar", "Ambedkar Nagar", ["REC AmbedkarNagar"]),
  rec("rec-azamgarh", "Azamgarh"), rec("rec-banda", "Banda"), rec("rec-bijnor", "Bijnor"),
  rec("rec-kannauj", "Kannauj"), rec("rec-mainpuri", "Mainpuri"), rec("rec-sonbhadra", "Sonbhadra"),
  rec("rec-mirzapur", "Mirzapur"),
];
