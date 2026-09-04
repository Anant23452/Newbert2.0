const crypto = require("crypto");
const { buildEffectiveSkillInventory } = require("./skillEvidenceService");
const { getSkillCategory, getSkillTargetRelevance, normalizeSkill, skillLabel } = require("./skillNormalizationService");
const { buildEvidenceReadiness } = require("./evidenceReadinessService");

const VERIFIED_STRENGTHS = new Set(["VERIFIED_PROJECT_USAGE", "STRONG_REPEATED_PROJECT_USAGE", "VERIFIED_ASSESSMENT"]);
const CORE_CS = new Set(["dbms", "oop", "operating-systems", "operating_systems", "computer-networks", "computer_networks"]);

function idFor(skill, order) { return `improve-${crypto.createHash("sha1").update(`${skill}:${order}`).digest("hex").slice(0, 12)}`; }
function task(skill, order, type, title, description, estimatedMinutes) { return { id: idFor(skill, order), title, description, type, estimatedMinutes, order, completed: false, completedAt: null }; }

function hasSubskillEvidence(profile, subskill) {
  if (!profile) return false;
  const canonical = normalizeSkill(subskill);
  const skills = (profile.skills || []).map((s) => normalizeSkill(typeof s === "object" ? s.name || s.skill : s));
  if (skills.includes(canonical)) return true;

  if (canonical === "sql") {
    return skills.some((s) => ["sql", "postgresql", "mysql", "mongodb"].includes(s)) ||
      (profile.projectDetails || []).some((p) =>
        (p.detectedTechnologies || []).some((t) => ["sql", "postgresql", "mysql"].includes(normalizeSkill(t.canonical || t.name)))
      );
  }
  if (canonical === "javascript") {
    return skills.some((s) => ["javascript", "typescript", "react", "nodejs"].includes(s));
  }
  return false;
}

function taskBlueprint(skillId, skillName, hasEvidence, profile = null) {
  const subject = skillName;
  const hasSql = hasSubskillEvidence(profile, "sql");
  const hasJs = hasSubskillEvidence(profile, "javascript");

  if (skillId === "dbms") {
    if (hasSql) {
      return [
        ["learn", "Keys and normalization", "Practice modelling relationships through normal forms (1NF to 3NF).", 70],
        ["learn", "Transactions and ACID", "Explain consistency, isolation levels, and rollback guarantees with examples.", 60],
        ["practice", "Indexing and query optimization", "Analyze query execution plans and index trade-offs.", 60],
        ["interview", "Practice 15 DBMS interview questions", "Answer aloud and record weak explanations for revision.", 90],
        ["assessment", "DBMS verification assessment", "Submit an assessment result when Newbert assessment verification is available.", 45],
      ];
    }
    return [
      ["learn", "SQL fundamentals", "Review queries, joins, grouping, and constraints.", 75],
      ["learn", "Keys and normalization", "Practice modelling relationships through normal forms.", 70],
      ["learn", "Transactions and ACID", "Explain consistency, isolation, and rollback with examples.", 60],
      ["practice", "Indexing and query trade-offs", "Compare common indexing choices and query plans.", 60],
      ["interview", "Practice 15 DBMS interview questions", "Answer aloud and record weak explanations for revision.", 90],
      ["assessment", "DBMS verification assessment", "Submit an assessment result when Newbert assessment verification is available.", 45],
    ];
  }

  if (skillId === "oop") {
    return [
      ["learn", "OOP foundations", "Review encapsulation, abstraction, inheritance, and polymorphism.", 60],
      ["practice", "Model a small domain", "Turn requirements into classes, responsibilities, and relationships.", 75],
      ["review", "SOLID and trade-offs", "Identify when common OOP patterns help or add unnecessary complexity.", 60],
      ["interview", "Practice 15 OOP interview questions", "Explain design choices with concrete code examples.", 80],
      ["assessment", "OOP verification assessment", "Submit an assessment result when Newbert assessment verification is available.", 45],
    ];
  }

  if (CORE_CS.has(skillId)) {
    return [
      ["learn", `${subject} foundations`, `Learn the core concepts and vocabulary behind ${subject}.`, 75],
      ["learn", `${subject} mechanisms`, "Connect the concepts to realistic system behaviour and trade-offs.", 75],
      ["practice", `Solve ${subject} scenarios`, "Work through practical questions before checking explanations.", 75],
      ["interview", `Practice ${subject} interview questions`, "Explain your answers aloud with examples.", 75],
      ["assessment", `${subject} verification assessment`, "Submit an assessment result when Newbert assessment verification is available.", 45],
    ];
  }

  if (skillId === "react") {
    if (hasJs) {
      return [
        ["learn", "Hooks and advanced state", "Use effects, custom hooks, and state management intentionally.", 75],
        ["build", "Integrate an API-backed feature", "Build loading, error, and empty states around a real API call.", 100],
        ["project", "Publish a production React project", "Deploy and push clean component architecture to GitHub.", 120],
        ["github", "Verify project evidence", "Sync GitHub after the implementation is available.", 25],
        ["assessment", "React verification assessment", "Demonstrate component patterns and performance optimization.", 45],
      ];
    }
    return [
      ["learn", "Component fundamentals", "Build reusable components with clear props and state boundaries.", 70],
      ["learn", "Hooks and data flow", "Use effects, derived state, and event handling intentionally.", 75],
      ["build", "Integrate one API-backed feature", "Build loading, error, and empty states around a real API call.", 100],
      ["project", "Publish a small React feature", "Add the feature to a reviewable repository or project.", 120],
      ["github", "Verify project evidence", "Sync GitHub after the implementation is available.", 25],
    ];
  }

  if (["nodejs", "express", "rest-api", "rest_api"].includes(skillId)) {
    return [
      ["learn", `${subject} fundamentals`, "Review the runtime, request lifecycle, and modular application structure.", 70],
      ["build", "Build one API endpoint", "Implement validation, errors, and a clear response contract.", 100],
      ["practice", "Handle failure cases", "Test missing input, invalid data, and authorization boundaries.", 60],
      ["project", "Publish backend evidence", "Add the implementation to a reviewable project.", 90],
      ["github", "Verify project evidence", "Sync GitHub after the implementation is available.", 25],
    ];
  }

  if (skillId === "dsa") {
    return [
      ["learn", "Review core patterns", "Choose patterns based on constraints, not memorized answers.", 60],
      ["leetcode", "Solve a focused problem set", "Practice a balanced set and use accepted solutions as evidence.", 120],
      ["review", "Review mistakes", "Write down why each missed solution failed.", 45],
      ["interview", "Explain solutions aloud", "Practice complexity analysis and edge cases.", 60],
    ];
  }

  const firstTitle = hasEvidence ? `Strengthen practical ${subject}` : `Learn ${subject} foundations`;
  return [
    ["learn", firstTitle, hasEvidence ? "Skip repeated basics and focus on the next useful concepts." : `Build a reliable foundation in ${subject}.`, 75],
    ["practice", `Practice ${subject} scenarios`, "Apply the concept to small, realistic exercises.", 75],
    ["build", `Use ${subject} in a focused feature`, "Create reviewable work instead of only consuming material.", 100],
    ["review", `Review ${subject} trade-offs`, "Explain what you chose and why.", 45],
    ["github", "Sync or submit real evidence", "Connect an existing supported source when it can verify this skill.", 25],
  ];
}

function buildTasks(skillId, skillName, hasEvidence, profile = null) {
  return taskBlueprint(skillId, skillName, hasEvidence, profile).map(([type, title, description, minutes], index) =>
    task(skillId, index + 1, type, title, description, minutes)
  );
}

function progress(tasks) { const completed = tasks.filter((item) => item.completed).length; return tasks.length ? Math.round((completed / tasks.length) * 100) : 0; }

function studentEvidence(profile, skillId) {
  const inventory = buildEffectiveSkillInventory(profile, { targetRole: profile.targetRole });
  const item = inventory.effectiveSkills.find((skill) => skill.canonical === skillId);
  return { inventory, item, verified: Boolean(item && VERIFIED_STRENGTHS.has(item.evidenceStrength)) };
}

function alumniFrequency(skillId, alumni = []) {
  const matching = alumni.filter((alumniProfile) => {
    const skills = [...(alumniProfile.skills || []), ...(alumniProfile.csFundamentals || []).map((item) => item?.subject || item)];
    return skills.some((value) => normalizeSkill(value) === skillId);
  }).length;
  return { matched: matching, total: alumni.length };
}

function generateImprovementPlan({ profile, skill, alumni = [], existingPlan = null }) {
  const skillId = normalizeSkill(skill);
  if (!skillId) { const error = new Error("Choose a valid skill to improve."); error.status = 400; throw error; }
  const skillName = skillLabel(skill);
  const student = studentEvidence(profile, skillId);
  const alumniMatch = alumniFrequency(skillId, alumni);
  const targetRelevance = getSkillTargetRelevance(skillId, profile.targetRole || "software engineer");
  const targetRequirement = ["HIGH", "MEDIUM"].includes(targetRelevance);
  const verified = student.verified;
  const hasEvidence = Boolean(student.item);
  const tasks = existingPlan?.tasks?.length ? existingPlan.tasks : buildTasks(skillId, skillName, hasEvidence, profile);
  const progressPercent = progress(tasks);
  const status = verified ? "verified" : existingPlan?.evidence?.length ? "evidence_submitted" : existingPlan?.addedToRoadmapAt ? "in_progress" : "not_started";
  const totalMinutes = tasks.reduce((sum, item) => sum + Number(item.estimatedMinutes || 0), 0);
  return {
    skillId,
    skillName,
    source: "next_unlock",
    reason: {
      studentEvidenceStatus: verified ? "verified" : hasEvidence ? "unverified" : "none",
      studentEvidenceSummary: student.item?.summary || "No verified student evidence.",
      alumniMatch,
      targetRole: profile.targetRole || null,
      targetCompanyType: profile.targetCompany || null,
      targetRequirement,
      category: getSkillCategory(skillId),
    },
    targetLevel: targetRelevance === "HIGH" ? "intermediate" : "beginner",
    estimatedDays: { min: Math.max(2, Math.ceil(totalMinutes / 150)), max: Math.max(3, Math.ceil(totalMinutes / 90)) },
    status,
    tasks,
    evidence: existingPlan?.evidence || [],
    progressPercent,
    lastReadiness: buildEvidenceReadiness(profile),
  };
}

module.exports = { VERIFIED_STRENGTHS, buildTasks, generateImprovementPlan, progress, studentEvidence };
