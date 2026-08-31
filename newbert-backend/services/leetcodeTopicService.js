const trackedTopics = require("../data/leetcodeProblemTopics.json");

const ALIASES = Object.freeze({ graphs: "graph", graph: "graph", dfs: "dfs", bfs: "bfs", dp: "dynamic_programming", dynamicprogramming: "dynamic_programming", "dynamic-programming": "dynamic_programming", "priority-queue": "priority_queue", priorityqueue: "priority_queue", binarytree: "tree", bst: "bst" });
function normalizeTopic(value) { const key = String(value || "").toLowerCase().replace(/[^a-z0-9-]/g, ""); return ALIASES[key] || key.replace(/-/g, "_"); }
function problemId(value) { const match = String(value || "").match(/(?:^|\D)(\d{1,5})(?:\D|$)/); return match?.[1] || null; }

function buildLeetcodeTopicEvidence(stats = {}) {
  const solved = Array.isArray(stats.solvedProblems) ? stats.solvedProblems : [];
  const tagged = solved.filter((item) => Array.isArray(item.topics) && item.topics.length);
  const tracked = solved.map((item) => ({ item, id: item.id || item.questionId || problemId(item.frontendQuestionId) })).filter(({ id }) => id && trackedTopics[String(id)]);
  if (!tagged.length && !tracked.length) return { totalSolved: Number(stats.totalSolved) || 0, topicEvidenceAvailable: false, topics: {}, note: "Topic-level LeetCode evidence unavailable" };
  const topicProblems = new Map();
  for (const item of tagged) for (const topic of item.topics) { const key = normalizeTopic(topic); if (key) (topicProblems.get(key) || topicProblems.set(key, new Set()).get(key)).add(item.titleSlug || item.id || item.title); }
  for (const { item, id } of tracked) for (const topic of trackedTopics[String(id)]) { const key = normalizeTopic(topic); (topicProblems.get(key) || topicProblems.set(key, new Set()).get(key)).add(item.titleSlug || id); }
  const trackedTotals = {};
  for (const topics of Object.values(trackedTopics)) for (const topic of topics) { const key = normalizeTopic(topic); trackedTotals[key] = (trackedTotals[key] || 0) + 1; }
  const topics = Object.fromEntries([...topicProblems.entries()].map(([topic, problems]) => {
    const denominator = tagged.length ? problems.size : Math.max(problems.size, trackedTotals[topic] || problems.size);
    return [topic, { solved: problems.size, trackedProblems: denominator, score: Math.round((problems.size / denominator) * 100), confidence: tagged.length ? 0.9 : 0.65, dataset: tagged.length ? "leetcode_tags" : "tracked_topic_dataset" }];
  }));
  return { totalSolved: Number(stats.totalSolved) || 0, topicEvidenceAvailable: true, topics, note: tagged.length ? null : "Topic coverage is based only on Newbert's maintained tracked-problem dataset." };
}

module.exports = { buildLeetcodeTopicEvidence, normalizeTopic };
