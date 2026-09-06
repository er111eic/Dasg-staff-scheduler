import { test } from "node:test";
import assert from "node:assert/strict";
import { findConflictingSlots } from "./scheduling.js";

test("overlapping times conflict, adjacent times and different dates do not", () => {
  const first = "8/8__09:00–10:00__a__主攝";
  const overlap = "8/8__09:30-10:30__b__音控";
  const adjacent = "8/8__10:30-11:00__b__主攝";
  const otherDay = "8/9__09:00–10:00__a__主攝";
  assert.deepEqual([...findConflictingSlots({ [first]: "甲", [overlap]: "甲", [adjacent]: "甲", [otherDay]: "甲" })], [first, overlap]);
});

test("same-session roles conflict but whole-event work is excluded", () => {
  const first = "8/8__09:00-10:00__a__主攝";
  const second = "8/8__09:00-10:00__a__副攝";
  assert.deepEqual([...findConflictingSlots({ [first]: "甲", [second]: "甲", "event__one__剪輯": "甲", "8/8__09:00-10:00__a__剪輯": "甲" }, ["剪輯"])], [first, second]);
});
