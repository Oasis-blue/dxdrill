# DxDrill Visual Practical System — Consolidated Specification

**Status:** Proposal for review  
**Scope:** Gross anatomy, radiological anatomy, clinical signs, physiology diagrams and future visual material in other subjects  
**Baseline audited:** `main` at the time of the initial audit (re-check the branch head before implementation)

## 1. Purpose

Build a visual practical-learning system that supports specimen, model, diagram, radiograph and clinical-sign questions in both:

- ordinary topic-based learning (Practice, Hall and Flashcards); and
- practical/steeplechase sessions in which one visual station may contain several related questions.

The system must be extensible beyond anatomy and physiology. It must not be coupled to a fixed list of subjects or image folders.

## 2. Existing behaviour to preserve

The current application already:

- loads ordinary questions from files listed in `data/manifest.json`;
- accepts a question-level `image` path;
- resolves a bare image filename to the legacy `data/img/histo/` directory;
- resolves a folder-prefixed image path under `data/img/` (for example `gross/liver-01.jpg`);
- renders question images in Practice, Hall and Flashcards;
- displays an optional `credit` under the main image;
- includes eligible image MCQs in Spotter; and
- groups Spotter questions by image path, selecting one question at random for that image.

Compatibility requirements:

1. Existing question JSON must continue loading without edits.
2. Existing histology filenames and paths must continue resolving exactly as before.
3. Existing questions without visual metadata must behave exactly as they do now.
4. New question properties must be optional and safely ignored by older code.
5. The existing Wikimedia visual-learning panel is out of scope and must not be modified as part of this work.

## 3. Audit findings and limitations

The current Spotter pool requires an image, exactly four options and a numeric answer. It groups by image path, but a station currently presents only one randomly selected question. There is no station-level record, no marker-coordinate model or overlay editor, and no reusable image-library entity. Live Rooms currently excludes image questions from its pool.

The existing `docs/gross-clinical-prompt.md` describes a `slides[]` object with nested `questions[]`. That shape is **not** the shape consumed by the current question loader, which expects a question file with a top-level `topic` and `questions[]`. The prompt therefore needs an explicit intake-to-bank transformation; its output should not be described as directly loadable by the site.

The current prompt also says every correct answer must be option zero. That is acceptable for an intake convention, but the final bank should continue to use the normal question schema and the application’s normal option-shuffling behaviour.

## 4. Core data model

Use three related concepts:

### 4.1 Visual asset

A visual asset is the reusable image file and its descriptive/attribution metadata.

Required fields:
- `id`: stable unique identifier, lowercase kebab-case;
- `file`: path relative to `data/img/`, including a folder;
- `kind`: one of `specimen`, `model`, `diagram`, `xray`, `clinical-sign`, or a future documented value;
- `alt`: concise accessible description;
- `credit`: source and licence/author, or `Photo: own`.

Optional fields:
- `sourceUrl`: source page URL where applicable;
- `licence`: explicit licence identifier;
- `notes`: editorial notes.

An asset can be associated with more than one curriculum topic and more than one station. Do not assume that one file belongs to only one topic.

### 4.2 Visual station

A station is one practical presentation unit. It references one visual asset and contains an ordered set of related question IDs.

Required fields:
- `id`: stable unique station ID;
- `assetId`: reference to a visual asset;
- `topic`: a valid curriculum topic ID used as the station's primary topic;
- `questionIds`: ordered list of existing question IDs;
- `title`: short internal/display label.

Optional fields:
- `marks`: mapping from visible marker labels (for example A, B, C) to structure names;
- `instructions`: station-level candidate instruction;
- `seconds`: optional suggested station duration;
- `tags`: cross-topic descriptors.

A station may have multiple questions, and a question may be associated with a station. In the initial implementation, one question belongs to at most one station. If genuine reuse across multiple stations becomes necessary, this constraint can be relaxed deliberately rather than accidentally.

### 4.3 Ordinary question

Questions remain normal DxDrill question records. Keep the existing fields and add optional visual references:

- `visualStationId`: station ID;
- `image`: asset file path, retained for compatibility with current renderers;
- `alt`: image alt text;
- `credit`: image attribution.

The question must retain its normal `topic`, `id`, `q`, `options`, `answer` and `explain` fields. This ensures that the same question is available to topic practice and other existing modes without requiring a separate visual-only question bank.

## 5. Canonical data files

Proposed first-version layout:

```text
data/
  visual-assets.json
  visual-stations.json
  img/
    histo/       # existing legacy collection; unchanged
    gross/
    diagrams/
    clinical/
    xray/
```

The asset and station registries are separate from the ordinary question files. Ordinary questions continue to be listed in `data/manifest.json` and loaded through the existing question loader.

Example `data/visual-assets.json`:

```json
{
  "assets": [
    {
      "id": "liver-specimen-01",
      "file": "gross/liver-specimen-01.jpg",
      "kind": "specimen",
      "alt": "Anterior view of a liver specimen with markers A and B.",
      "credit": "Photo: own"
    }
  ]
}
```

Example `data/visual-stations.json`:

```json
{
  "stations": [
    {
      "id": "liver-specimen-station-01",
      "assetId": "liver-specimen-01",
      "topic": "gr-abdomen-pelvis-and-perineum",
      "title": "Liver specimen",
      "questionIds": [
        "liver-specimen-01-a",
        "liver-specimen-01-b",
        "liver-specimen-01-c"
      ],
      "marks": {
        "A": "Structure identified by marker A",
        "B": "Structure identified by marker B"
      }
    }
  ]
}
```

Example ordinary question file:

```json
{
  "topic": "gr-abdomen-pelvis-and-perineum",
  "questions": [
    {
      "id": "liver-specimen-01-a",
      "level": 1,
      "sub": "Liver",
      "q": "Identify the structure marked A.",
      "options": [
        "Correct structure",
        "Plausible alternative 1",
        "Plausible alternative 2",
        "Plausible alternative 3"
      ],
      "answer": 0,
      "explain": "A concise explanation that teaches the identifying feature.",
      "image": "gross/liver-specimen-01.jpg",
      "alt": "Anterior view of a liver specimen with markers A and B.",
      "credit": "Photo: own",
      "visualStationId": "liver-specimen-station-01"
    }
  ]
}
```

The examples are structural templates, not verified anatomy content. Real labels, answers and explanations must be checked against trusted teaching material.

## 6. Intake and import contract

The current prompt should be revised to distinguish **AI intake output** from **site-ready bank data**.

Recommended intake output:

```json
{
  "topic": "gr-abdomen-pelvis-and-perineum",
  "assets": [
    {
      "id": "liver-specimen-01",
      "file": "gross/liver-specimen-01.jpg",
      "kind": "specimen",
      "alt": "Anterior view of a liver specimen with markers A and B.",
      "credit": "Photo: own",
      "marks": {
        "A": "Structure to be verified",
        "B": "Structure to be verified"
      },
      "unsure": false,
      "check": "",
      "questions": [
        {
          "id": "liver-specimen-01-a",
          "level": 1,
          "sub": "Liver",
          "q": "Identify the structure marked A.",
          "options": ["Correct answer", "Distractor 1", "Distractor 2", "Distractor 3"],
          "answer": 0,
          "explain": "Brief teaching explanation."
        }
      ]
    }
  ]
}
```

Import transformation:
1. Validate topic IDs against `data/curriculum.json`.
2. Validate asset IDs, file paths, image extensions and allowed folders; reject traversal paths and malformed paths.
3. Validate unique question IDs against both the incoming batch and the existing bank.
4. Validate every station question's required fields and four-option MCQ structure where intended.
5. Preserve uncertainty: assets marked `unsure: true` or with a non-empty `check` must be held for human review, not silently imported as verified content.
6. Generate/update `visual-assets.json`, `visual-stations.json`, and ordinary question files/manifest entries as one reviewed import operation.
7. Ensure every station question has the same `image`, `alt`, `credit` and `visualStationId` references.
8. Report imported, skipped, duplicate and review-required records separately.

Do not let the AI prompt claim that its nested intake JSON is directly loadable by the website.

## 7. Spotter / Visual Practical behaviour

The new station-aware mode should:

- build a station pool from valid station records and their referenced questions;
- allow filtering by curriculum topic/area/subject using the existing curriculum hierarchy;
- show the visual asset once at the start of a station;
- ask all station questions in their defined order, one at a time;
- retain the current timed progression, bell option and no-backtracking practical feel;
- record each question result against its ordinary question ID, so existing analytics and missed-question review continue to work;
- show a station review containing the image, each question, the learner's answer, correct answer and explanation;
- handle missing images and invalid references gracefully, with a useful warning rather than a broken run.

A station's question count and timing should be visible before starting. Suggested timing may be configured per station, but the learner's existing global timing controls should remain available as an override.

Compatibility fallback: questions with `image` but no `visualStationId` remain eligible for the current one-question-per-image Spotter behaviour until they are migrated. Grouping should prefer `visualStationId` when present and use image path only as the legacy fallback.

## 8. Markers and image interaction

### First release
Use markers burned into the image file (A/B/C labels or arrows) and store the label-to-structure mapping in station metadata. This is simple, reliable on mobile and consistent across modes.

### Later enhancement
Consider app-rendered overlays with normalized coordinates (0–1) and interactive marker hit areas. This requires:
- an authoring workflow to place and edit markers;
- responsive scaling that preserves marker alignment;
- keyboard and screen-reader alternatives;
- touch targets suitable for phones;
- a non-interactive fallback when overlays fail.

Do not make coordinate overlays a dependency for the first working release.

## 9. Mode integration

- **Practice:** existing question-level image rendering remains; no new station dependency.
- **Hall:** existing question-level image rendering remains.
- **Flashcards:** retain question image display.
- **Visual Practical/Spotter:** add station-aware multi-question runs.
- **Live Rooms:** excluded from the initial scope. Its current server-side pool excludes image questions; adding visual stations requires a separate review of Supabase payloads, image delivery, permissions and room performance.
- **Wikimedia visual-learning panel:** explicitly untouched.

## 10. Asset, licensing and safety rules

- Use original photos/drawings or images with a licence that permits the intended reuse.
- Record author, source and licence accurately; retain source URLs where available.
- Do not use textbook scans, arbitrary Google image results, or assets whose reuse rights are unclear.
- Avoid identifiable patients and identifying metadata. Obtain written consent where a clinical photograph includes a person; follow institutional rules for dissection-hall photography.
- Verify all labels, answers and explanations manually. AI uncertainty must be surfaced, not guessed away.
- Optimise images for mobile (target roughly 1200 px on the longest practical edge, with reasonable file size) while preserving enough detail for identification.
- Ensure useful alt text and visible image attribution.

## 11. Rollout plan and acceptance criteria

### Stage 1 — Data contract and intake
- Revise `docs/gross-clinical-prompt.md` to use the intake schema above.
- Document the normalized bank schema and import validation.
- Create a small validated sample batch; do not bulk-import unverified images.
- Acceptance: sample assets, stations and questions validate; ordinary questions still load; no legacy data changes are required.

### Stage 2 — Station-aware Visual Practical
- Load and validate station/asset registries.
- Implement multi-question station progression and review.
- Keep legacy image questions working through fallback.
- Acceptance: one image can present multiple questions in order; results are recorded per question; old Spotter content still works.

### Stage 3 — Markers and authoring
- Support baked-in markers first.
- Evaluate coordinate overlays only after real phone testing.
- Acceptance: labels remain legible at mobile sizes and answer mapping is independently checked.

### Stage 4 — Broader integration and expansion
- Test Practice, Hall, Flashcards and offline behaviour.
- Consider Live Rooms only as a separate scoped change.
- Expand image types and subjects based on verified content and usage.

## 12. Initial validation batch

Use five stations to exercise distinct asset types:

1. Liver specimen — gross anatomy; multiple marked structures.
2. Heart specimen — gross anatomy; structures and relations.
3. Brachial plexus — anatomical diagram; branches and lesion correlation.
4. Froment's sign — clinical sign; observed sign and nerve/structure correlation.
5. ECG — physiology diagram; waveform identification and interpretation.

These are test categories only. No question or label should be generated/imported until the actual image and its source/notes are available and the answer key is independently verified.

## 13. Explicit non-goals for the first release

- Replacing the existing question bank.
- Rewriting all existing histology image questions.
- Building a full image editor or marker-placement interface.
- Adding image stations to Live Rooms.
- Modifying the Wikimedia visual-learning panel.
- Automatically trusting AI-generated anatomical labels or explanations.

## 14. Review decisions requested

Please review these architectural choices before implementation:

1. Separate `visual-assets.json` and `visual-stations.json` registries, with ordinary question records remaining the source for question content.
2. One station has one primary topic and an ordered list of question IDs; each question keeps its ordinary topic and can therefore remain available in normal practice.
3. First release uses labels baked into images; interactive coordinate overlays are deferred.
4. Legacy image-only questions remain supported as one-question Spotter stations.
5. Live Rooms and the Wikimedia visual-learning panel remain out of scope initially.
