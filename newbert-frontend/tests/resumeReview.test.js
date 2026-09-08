import test from "node:test";
import assert from "node:assert/strict";
import { reviewResume } from "../src/utils/resumeReview.js";
test("resume coverage is calculated from actual supplied text", () => {
  const result = reviewResume("Student\nBuilt a React application", "We need React and Python developers");
  assert.equal(result.coverage, 50);
  assert.deepEqual(result.matched, ["React"]);
  assert.deepEqual(result.missing, ["Python"]);
  assert.deepEqual(result.evidenceLines, ["Built a React application"]);
});
test("keyword matching handles punctuation and word boundaries", () => {
  assert.deepEqual(reviewResume("JavaScript", "Java developer").matched, []);
  assert.deepEqual(reviewResume("Used C++ and Node.js", "C++ Node.js required").missing, []);
  assert.equal(reviewResume("No technical keywords", "A general role").coverage, null);
});
