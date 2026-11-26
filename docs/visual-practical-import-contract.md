# Visual practical intake-to-bank contract

**Status:** Stage 1 contract. This document defines validation and conversion requirements; it does not claim that an importer or visual-station runtime is implemented.

> **Backward-compatibility guarantee:** The new attribution, provenance and intake-validation rules apply only to new assets submitted through this visual-practical import workflow. They do not retroactively invalidate, hide, quarantine or require re-import of existing histology images or existing question-bank records. Existing histology image paths, credits and rendering behaviour must be preserved. Any future change to legacy assets must be handled as a separate, explicitly reviewed migration.

## 1. Two distinct formats

The AI output described in `docs/gross-clinical-prompt.md` is an **intake document**. It is not directly loadable by DxDrill.

The website's existing question loader reads files listed in `data/manifest.json`. Each question file has a top-level `topic` and `questions` array. Each ordinary question keeps its normal fields, including `id`, `q`, `options`, `answer` and `explain`. The loader also supports question-level `topic` overrides.

The eventual normalized bank output will consist of:

- ordinary question files in `data/questions/<file-id>.json`, listed in `data/manifest.json`;
- `data/visual-assets.json`, containing reusable image metadata; and
- `data/visual-stations.json`, containing station metadata and ordered question IDs.

The registries are an additive layer. The ordinary question bank remains the source of question content.

## 2. Intake fields

The intake root contains `schemaVersion: 1`, one exact curriculum `topic` ID, and an `assets` array.

Each asset contains:

- stable `id`;
- repository-relative `file` path beneath `data/img/`;
- `kind`, `alt` and `credit`;
- source URL and licence metadata where applicable;
- `marks` mapping visible labels to proposed structures;
- explicit `unsure` and `check` fields;
- a station object with stable ID, title and optional instructions/duration; and
- an ordered array of ordinary question payloads.

Each question has a unique ID, question text, four options, a zero-based answer index, explanation and uncertainty fields. The prompt convention places the correct option first and uses answer index 0, but the normalized question file must follow the existing bank's answer and option-shuffling conventions.

## 3. Required validation before any import

An importer must fail closed: if any required check fails, it must not partially update the registries, question files or manifest.

### Curriculum and identity

1. Confirm the topic exists in `data/curriculum.json`.
2. Confirm asset, station and question IDs match the agreed identifier format.
3. Reject duplicate IDs within the batch and collisions with existing bank/registry IDs.
4. Reject empty asset or question arrays.

### Image integrity and delivery

1. Confirm each referenced image file exists in the repository at the exact normalized path.
2. Restrict paths to the allowed `data/img/` root and reject traversal, absolute paths, query strings, fragments, encoded traversal and unsupported extensions.
3. Confirm the file is a supported raster image and is non-empty.
4. Verify image decoding and dimensions; reject corrupt files.
5. Confirm the actual image can be fetched from the same-origin deployed asset path. A filename in JSON is not proof that an image exists.
6. Require meaningful alt text and visible attribution.
7. Do not create or import a question whose correct answer depends on an image that is missing, corrupt or not approved.

### Attribution and consent

1. Require a truthful credit for every image.
2. For third-party images, require source URL and exact reuse licence/permission.
3. Hold any image with unclear rights, consent or identifying information for review.
4. Do not infer a licence or consent from the location where an image was found.

### Question quality

1. Require all normal question fields and exactly four non-empty options for MCQs.
2. Require an integer answer index from 0 to 3.
3. Require a non-empty explanation that teaches the concept without contradicting the keyed answer.
4. Require unique question IDs and a valid topic.
5. Require every question in an asset's station to inherit that asset's image path, alt text, credit and station ID during normalization.
6. Require all marker references used in question stems to exist in the asset's `marks` map.
7. If the asset or any associated question has `unsure: true` or a non-empty `check`, quarantine the entire asset/station for human review. Do not import it as verified content.

### Station integrity

1. Each station references exactly one existing asset.
2. Each station's ordered question ID list is non-empty and contains only questions generated from that asset.
3. No question ID appears twice in the same station.
4. The station's primary topic must be a valid curriculum topic; each ordinary question retains its own topic.
5. Station and asset references must resolve in both directions after normalization.

## 4. Normalization rules

For each approved asset:

- add or update one visual asset record using the stable asset ID and metadata;
- add one visual station record using the station ID, asset ID, primary topic, title, ordered question IDs, marker map and optional timing/instructions;
- emit ordinary question records using the existing DxDrill question schema;
- copy the asset's image path, alt text and credit into every associated ordinary question;
- add the station reference to each associated question as optional `visualStationId`;
- add the resulting question file to `data/manifest.json` without removing or reordering unrelated entries.

The importer must produce a human-readable report listing accepted records, quarantined records, duplicates, validation errors and every file it intends to change. Writes must be atomic/reviewable: no partial manifest or registry update on failure.

## 5. Runtime safety requirements

These are acceptance requirements for the later Visual Practical implementation, not claims about the current app:

- A station is eligible only if its asset record, image file and every referenced question are valid.
- A failed image load must prevent that image-dependent question/station from being presented as a text-only question.
- The UI must show a clear load failure and offer a retry where appropriate.
- Practice, Hall and Flashcards continue to use ordinary question-level image rendering.
- Live Rooms continues excluding image-dependent questions until a separate network/delivery design is reviewed and tested.
- Legacy image questions remain supported through the existing fallback behaviour.
- The Wikimedia visual-learning panel remains untouched.

## 6. Sample-batch status

No sample batch is declared validated by this document. A real batch requires actual image files, confirmed provenance/licences, checked marker mappings and independently reviewed answers. The first proposed validation set remains a liver specimen, heart specimen, brachial plexus diagram, Froment's sign and ECG, but these are targets for testing—not existing assets or approved questions.
