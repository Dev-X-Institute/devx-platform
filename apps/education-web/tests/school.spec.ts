import { expect, test } from "@playwright/test";
import { migrateSchoolState, seedSchoolState } from "../src/school";

test("seed data defines five subjects, three teachers, two schemes and a JHS 2 form master", () => {
  const state = seedSchoolState();
  expect(state.subjects).toHaveLength(5);
  expect(state.teachers).toHaveLength(3);
  expect(state.gradingSchemes).toHaveLength(2);
  expect(state.gradingSchemes[0]!.weights.classScore).not.toBe(state.gradingSchemes[1]!.weights.classScore);
  expect(state.formMasters.some(assignment => assignment.className === "JHS 2")).toBe(true);
});

test("v1 save migrates with seeded school slices", () => {
  const seed = seedSchoolState();
  const migrated = migrateSchoolState({ payments: [] }, seed);
  expect(migrated.subjects).toEqual(seed.subjects);
  expect(migrated.marks).toEqual([]);
  expect(migrated.gradingSchemes).toEqual(seed.gradingSchemes);
});
