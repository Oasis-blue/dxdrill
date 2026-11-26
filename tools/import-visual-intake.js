#!/usr/bin/env node
"use strict";

/*
 * Convert a validated visual-practical intake into ordinary DxDrill question
 * files plus the additive asset/station registries. Dry-run unless --apply.
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { validateIntake } = require("./validate-visual-intake.js");

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function json(value) { return JSON.stringify(value, null, 2) + "\n"; }

function buildPlan(intake, root = process.cwd()) {
  const validation = validateIntake(intake, { root });
  if (!validation.ok) return { ok: false, validation, files: [] };

  const manifestPath = path.join(root, "data/manifest.json");
  const manifest = readJson(manifestPath);
  const assetsPath = path.join(root, "data/visual-assets.json");
  const stationsPath = path.join(root, "data/visual-stations.json");
  const assetsRegistry = fs.existsSync(assetsPath) ? readJson(assetsPath) : { assets: [] };
  const stationsRegistry = fs.existsSync(stationsPath) ? readJson(stationsPath) : { stations: [] };
  if (!Array.isArray(manifest.questions) || !Array.isArray(assetsRegistry.assets) || !Array.isArray(stationsRegistry.stations)) {
    return { ok: false, validation, error: "Manifest or visual registry has an unexpected structure.", files: [] };
  }

  const files = [];
  const nextManifest = { ...manifest, questions: manifest.questions.slice() };
  const nextAssets = { ...assetsRegistry, assets: assetsRegistry.assets.slice() };
  const nextStations = { ...stationsRegistry, stations: stationsRegistry.stations.slice() };

  for (const asset of intake.assets) {
    const fileId = "visual-" + asset.id;
    if (nextManifest.questions.includes(fileId) || fs.existsSync(path.join(root, "data/questions", fileId + ".json"))) {
      return { ok: false, validation, error: "Question file already exists for " + asset.id, files: [] };
    }
    const questionIds = asset.questions.map(q => q.id);
    const questions = asset.questions.map(q => ({
      id: q.id,
      type: "mcq",
      level: q.level,
      ...(q.sub ? { sub: q.sub } : {}),
      q: q.q,
      options: q.options.slice(),
      answer: q.answer,
      explain: q.explain,
      image: asset.file,
      alt: asset.alt,
      credit: asset.credit,
      visualStationId: asset.station.id
    }));
    const questionFile = { topic: intake.topic, questions };
    nextManifest.questions.push(fileId);
    nextAssets.assets.push({
      id: asset.id,
      file: asset.file,
      kind: asset.kind,
      alt: asset.alt,
      credit: asset.credit,
      sourceUrl: asset.sourceUrl || "",
      licence: asset.licence
    });
    nextStations.stations.push({
      id: asset.station.id,
      assetId: asset.id,
      topic: intake.topic,
      title: asset.station.title,
      questionIds,
      marks: asset.marks || {},
      ...(asset.station.instructions ? { instructions: asset.station.instructions } : {}),
      ...(Number.isInteger(asset.station.seconds) ? { seconds: asset.station.seconds } : {})
    });
    files.push({ path: "data/questions/" + fileId + ".json", content: json(questionFile) });
  }

  files.push(
    { path: "data/manifest.json", content: json(nextManifest) },
    { path: "data/visual-assets.json", content: json(nextAssets) },
    { path: "data/visual-stations.json", content: json(nextStations) }
  );
  return { ok: true, validation, files, summary: {
    assets: intake.assets.length,
    stations: intake.assets.length,
    questions: intake.assets.reduce((n, a) => n + a.questions.length, 0),
    changedFiles: files.map(f => f.path)
  }};
}

/* Stage every output first; restore originals if any rename fails. */
function applyPlan(plan, root = process.cwd()) {
  if (!plan.ok) throw new Error("Cannot apply an invalid visual intake.");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "dxdrill-visual-import-"));
  const staged = [], originals = [];
  try {
    for (let i = 0; i < plan.files.length; i++) {
      const item = plan.files[i], target = path.join(root, item.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const stage = path.join(temp, String(i));
      fs.writeFileSync(stage, item.content, { flag: "wx" });
      staged.push({ stage, target });
      originals.push({ target, backup: fs.existsSync(target) ? fs.readFileSync(target) : null });
    }
    const written = [];
    try {
      staged.forEach(({ stage, target }) => { fs.renameSync(stage, target); written.push(target); });
    } catch (error) {
      for (const item of originals) {
        if (!written.includes(item.target)) continue;
        if (item.backup === null) fs.rmSync(item.target, { force: true });
        else fs.writeFileSync(item.target, item.backup);
      }
      throw error;
    }
    return { ok: true, written: plan.files.map(f => f.path) };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function main(argv) {
  const file = argv.find(x => !x.startsWith("--"));
  if (!file) {
    console.error("Usage: node tools/import-visual-intake.js <intake.json> [--root <repo>] [--apply]");
    process.exitCode = 2; return;
  }
  const ri = argv.indexOf("--root"), root = ri >= 0 ? path.resolve(argv[ri + 1]) : process.cwd();
  try {
    const intake = readJson(path.resolve(file));
    const plan = buildPlan(intake, root);
    if (!plan.ok) {
      console.log(JSON.stringify({ ok: false, validation: plan.validation, error: plan.error }, null, 2));
      process.exitCode = 1; return;
    }
    if (argv.includes("--apply")) {
      const result = applyPlan(plan, root);
      console.log(JSON.stringify({ ...result, summary: plan.summary }, null, 2));
    } else {
      console.log(JSON.stringify({ ok: true, mode: "dry-run", summary: plan.summary, validation: plan.validation }, null, 2));
    }
  } catch (error) {
    console.error("Visual intake import failed:", error.message);
    process.exitCode = 2;
  }
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { buildPlan, applyPlan };
