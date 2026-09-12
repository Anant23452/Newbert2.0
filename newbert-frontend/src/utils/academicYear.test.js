import test from "node:test";
import assert from "node:assert/strict";
import { inferAcademicYear, profileBranch, validSemester, validYear } from "./academicYear.js";
test("class of 2027 selects year four in 2026–27 and year three before rollover", () => {
  assert.equal(inferAcademicYear(2027, new Date("2026-09-11")).year, 4);
  assert.equal(inferAcademicYear("2027", new Date("2026-06-30T10:00:00Z")).year, 3);
  assert.equal(inferAcademicYear(2027, new Date("2026-06-30T18:30:00Z")).year, 4);
});
test("missing, future and graduated profiles do not masquerade as current students", () => {
  const now = new Date("2026-09-11");
  assert.equal(inferAcademicYear(null, now).status, "unknown");
  assert.equal(inferAcademicYear(2026, now).status, "graduated");
  assert.equal(inferAcademicYear(2031, now).status, "future");
  assert.equal(inferAcademicYear(2030, now).year, 1);
});
test("branch aliases and invalid URL selections are handled without changing the profile", () => {
  assert.equal(profileBranch("IT"), "information-technology");
  assert.equal(profileBranch("Electrical Engineering"), "electrical");
  assert.equal(profileBranch("Mechanical Engineering"), null);
  assert.equal(validYear("5"), null); assert.equal(validYear("2"), 2);
  assert.equal(validSemester("2", 4), 7); assert.equal(validSemester("8", 4), 8);
});
