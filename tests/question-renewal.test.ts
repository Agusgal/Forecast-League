import assert from "node:assert/strict";
import test from "node:test";
import { createDemoSeed } from "../src/domain/seed";
import { renewDemoQuestions } from "../src/server/renew-demo-questions";
import type { LocalData } from "../src/server/local-store";
import { personalDataSchema } from "../src/domain/registration";

test("expired demo rounds are replaced additively, without extending deadlines or duplicating open rounds", () => {
  const data: LocalData = { ...createDemoSeed(new Date("2026-10-12T00:00:00Z")), version: 1, accounts: [], sessions: [], resolutions: [], scores: [] };
  const original = structuredClone(data);
  const now = new Date("2026-11-20T10:00:00Z");
  assert.equal(renewDemoQuestions(data, now), true);
  assert.deepEqual(data.questions.slice(0, original.questions.length), original.questions);
  assert.deepEqual(data.forecasts, original.forecasts);
  assert.deepEqual(data.revisions, original.revisions);
  const added = data.questions.slice(original.questions.length);
  assert.ok(added.length >= 8);
  assert.ok(added.every(q => q.isDemo && q.status === "PUBLISHED" && Date.parse(q.closesAt) > now.getTime()));
  const size = data.questions.length;
  assert.equal(renewDemoQuestions(data, now), false);
  assert.equal(renewDemoQuestions(data, new Date(now.getTime() + 1000)), false);
  assert.equal(data.questions.length, size);
});

test("required demographics and optional income are validated independently of public profiles", () => {
  const required = { birthCountry: "AR", residenceCountry: "ES", age: 35, sex: "undisclosed" };
  assert.deepEqual(personalDataSchema.parse(required), required);
  for (const key of Object.keys(required)) {
    assert.equal(personalDataSchema.safeParse({ ...required, [key]: undefined }).success, false);
  }
  assert.equal(personalDataSchema.safeParse({ ...required, annualIncome: 0, incomeCurrency: "ARS" }).success, true);
  assert.equal(personalDataSchema.safeParse({ ...required, annualIncome: 0 }).success, false);
});
