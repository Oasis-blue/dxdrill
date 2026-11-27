"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

test("visual station registry resolves every asset and its ordered question IDs", () => {
  const curriculum = readJson("data/curriculum.json");
  const topicIds = new Set(curriculum.subjects.flatMap(subject =>
    subject.areas.flatMap(area => area.topics.map(topic => topic.id))
  ));
  const manifest = readJson("data/manifest.json");
  const assets = readJson("data/visual-assets.json").assets;
  const stations = readJson("data/visual-stations.json").stations;
  const assetById = new Map(assets.map(asset => [asset.id, asset]));
  const questionsByStation = new Map();

  for (const fileId of manifest.questions) {
    const bank = readJson("data/questions/" + fileId + ".json");
    for (const question of bank.questions || []) {
      if (!question.visualStationId) continue;
      const list = questionsByStation.get(question.visualStationId) || [];
      list.push({ ...question, topic: question.topic || bank.topic });
      questionsByStation.set(question.visualStationId, list);
    }
  }

  assert.ok(stations.length > 0, "expected registered visual stations");
  assert.equal(new Set(stations.map(station => station.id)).size, stations.length,
    "station IDs must be unique");

  for (const station of stations) {
    const asset = assetById.get(station.assetId);
    assert.ok(asset, station.id + " must reference an existing visual asset");
    assert.ok(topicIds.has(station.topic), station.id + " must use a canonical topic ID");
    assert.ok(fs.existsSync(path.join(root, "data/img", asset.file)),
      station.id + " image must exist in data/img");

    const questions = questionsByStation.get(station.id) || [];
    assert.ok(questions.length > 0, station.id + " must have linked questions");
    assert.deepEqual(station.questionIds, questions.map(question => question.id),
      station.id + " questionIds must match the ordered bank questions");
    for (const question of questions) {
      assert.equal(question.topic, station.topic,
        question.id + " must use the station's canonical topic");
      assert.equal(question.image, asset.file,
        question.id + " must use its station image");
    }
  }

  for (const stationId of questionsByStation.keys()) {
    assert.ok(stations.some(station => station.id === stationId),
      stationId + " question group must have a registered station");
  }
});
