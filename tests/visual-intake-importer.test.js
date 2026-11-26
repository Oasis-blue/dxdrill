#!/usr/bin/env node
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildPlan, applyPlan } = require("../tools/import-visual-intake.js");

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC";
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dxdrill-import-test-"));
  fs.mkdirSync(path.join(root, "data/img/gross"), { recursive: true });
  fs.mkdirSync(path.join(root, "data/questions"), { recursive: true });
  fs.writeFileSync(path.join(root, "data/img/gross/liver.png"), Buffer.from(PNG, "base64"));
  fs.writeFileSync(path.join(root, "data/curriculum.json"), JSON.stringify({
    subjects: [{ areas: [{ topics: [{ id: "gr-abdomen-pelvis-and-perineum" }] }] }]
  }));
  fs.writeFileSync(path.join(root, "data/manifest.json"), JSON.stringify({ questions: ["existing-topic"] }));
  fs.writeFileSync(path.join(root, "data/questions/existing-topic.json"), JSON.stringify({ topic: "x", questions: [{ id: "existing-question" }] }));
  return root;
}
function intake() {
  return {
    schemaVersion: 1,
    topic: "gr-abdomen-pelvis-and-perineum",
    assets: [{
      id: "liver-test",
      file: "gross/liver.png",
      kind: "specimen",
      alt: "A liver specimen.",
      credit: "Test image, public domain",
      sourceUrl: "https://example.org/liver",
      licence: "Public domain",
      marks: {},
      unsure: false,
      check: "",
      station: { id: "liver-test-station", title: "Liver specimen", seconds: 60 },
      questions: [{
        id: "liver-test-q1", level: 1, sub: "Liver",
        q: "Which organ is shown?",
        options: ["Liver", "Kidney", "Spleen", "Pancreas"],
        answer: 0, explain: "The specimen is a liver.", unsure: false, check: ""
      }]
    }]
  };
}

test("dry-run builds a complete import plan without writing files", () => {
  const root = setup();
  const plan = buildPlan(intake(), root);
  assert.equal(plan.ok, true);
  assert.equal(plan.summary.questions, 1);
  assert.equal(fs.existsSync(path.join(root, "data/visual-assets.json")), false);
  assert.equal(fs.existsSync(path.join(root, "data/questions/visual-liver-test.json")), false);
  fs.rmSync(root, { recursive: true, force: true });
});

test("apply writes ordinary questions, registries and manifest references", () => {
  const root = setup();
  const plan = buildPlan(intake(), root);
  const result = applyPlan(plan, root);
  assert.equal(result.ok, true);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "data/manifest.json"), "utf8"));
  assert.deepEqual(manifest.questions, ["existing-topic", "visual-liver-test"]);
  const bank = JSON.parse(fs.readFileSync(path.join(root, "data/questions/visual-liver-test.json"), "utf8"));
  assert.equal(bank.questions[0].image, "gross/liver.png");
  assert.equal(bank.questions[0].visualStationId, "liver-test-station");
  const stations = JSON.parse(fs.readFileSync(path.join(root, "data/visual-stations.json"), "utf8"));
  assert.deepEqual(stations.stations[0].questionIds, ["liver-test-q1"]);
  fs.rmSync(root, { recursive: true, force: true });
});

test("uncertain stations are rejected and leave repository files untouched", () => {
  const root = setup(), data = intake();
  data.assets[0].unsure = true;
  data.assets[0].check = "Verify marker mapping.";
  const plan = buildPlan(data, root);
  assert.equal(plan.ok, false);
  assert.equal(fs.existsSync(path.join(root, "data/visual-assets.json")), false);
  fs.rmSync(root, { recursive: true, force: true });
});
