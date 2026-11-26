# True/False bank quality audit — batch 3

Date: 2026-11-26  
Scope: the existing 47-stem bank plus 10 additional source-referenced stems.

## New coverage

Added 10 stems across 10 curriculum topics:
- Physiology: mechanics of breathing, transport of respiratory gases, platelet haemostasis, cardiac cycle, red-cell oxygen delivery.
- Anatomy / embryology: neural tube development and early heart development.
- Medical Biochemistry: glycolysis, gluconeogenesis and the pentose phosphate pathway.

The new material uses the same statement-by-statement True/False interaction. Each stem has four independently judgeable statements, a mixed True/False key, a statement-specific explanation, and source links recorded on the stem.

## Explanation quality controls

For this batch:
- Every explanation was authored for its own statement and explicitly supports the associated answer key.
- The answer and explanation were reviewed together for the relevant mechanism or anatomical relationship.
- No identical explanation strings are reused within the combined bank.
- Automated checks cover missing/short explanations, repeated explanations, duplicate statement wording, duplicate IDs, topic validity, statement counts, mixed keys and manifest registration.

These checks reduce preventable editorial defects; they do not guarantee that a medical statement is infallible. New stems remain marked `verified: false` and `draft-unverified` pending a second independent subject-matter review against the linked references and the course's preferred textbooks.

## Current bank composition

- 57 total stems: 9 original + 38 in the expansion file + 10 batch-3 additions.
- 24 curriculum topics represented.
- All content remains unverified unless a future audit explicitly records source verification.

## Remaining work

- Continue source-checking existing and new stems individually.
- Expand into additional uncovered Anatomy, Physiology and Medical Biochemistry topics.
- Add the automated checks to the repository's normal validation workflow so future imports cannot silently reintroduce these defects.


## Batch 4 — 2026-11-26

Eight additional stems were added across gastrointestinal physiology, pancreatic and adrenal endocrinology, lipid metabolism, inguinal canal anatomy and femoral triangle anatomy. New stems each have four statements, individually written explanations and per-stem reference links.

The True/False loader was also changed to schedule the two True/False data files before the ordinary question files in the existing concurrent loading pool. While the first True/False stems are pending, the loading screen now displays a rotating nugget from the existing DxDrill nugget collection. The nugget rotation stops as soon as stems arrive or loading finishes.

Current composition after this batch: 65 stems, 265 statements, across 30 topics. All content remains draft/unverified pending independent textbook and source review.


## Batch 5 — 2026-11-26

Twelve additional stems have been added across general and systemic histology, pharyngeal apparatus embryology, gametogenesis, renal acid-base regulation, micturition, hypothalamic-pituitary physiology, neuronal action potentials, synaptic transmission, DNA replication, and vitamin B12/folate metabolism.

Each new stem contains four numbered statements, individual explanations, a mixed True/False key, and direct reference links. The batch intentionally broadens coverage beyond the previously emphasised gross anatomy, basic renal physiology and carbohydrate metabolism.

Combined bank after batch 5: 77 stems, 313 statements across 42 curriculum topics. Automated checks found 0 structural or explanation-reuse issues. All new stems remain `verified: false` / `draft-unverified` pending independent subject-matter review against standard course texts.


## Batch 6 — 2026-11-26

Twelve further stems have been added across bone histology and development, neuroanatomy, respiratory histology, ECG, cardiac output, blood groups, gonadal endocrinology, haemoglobin metabolism, biomembranes, haemostasis and general homeostasis.

Each new stem contains four statements, a mixed True/False answer key, statement-specific explanations and reference links. Automated structural checks were run against the curriculum and combined bank.

Combined bank: 89 stems, 361 statements across 54 curriculum topics. Structural issues detected by automated checks: 47. All content remains draft/unverified pending source-by-source subject-matter review.


## Source-provenance cleanup — 2026-11-26

The earlier audit identified a missing-reference metadata gap. This cleanup adds source links to all previously unreferenced stems in both True/False data files.

- Total stems reviewed for reference metadata: 89
- Stems now carrying one or more reference links: 89
- Stems still without references: 0
- Entries with malformed non-HTTPS reference values: 0

Important qualification: these are **topic-level supporting references**, not proof that each individual statement has been independently checked against every cited source. A reference field is provenance assistance, not a verification flag. All questions remain draft/unverified until a human subject reviewer checks the complete stem, answer key and explanation against the relevant source. The `referenceScope` field identifies the older stems whose links were added at topic level.


## Content verification pass — 2026-11-26

A first claim-level review was completed for the following 7 stems. Each statement's truth value and explanation was checked against the cited subject reference(s), and the stem remains in the existing question bank.

- Verified stems: tf-gr-upper-limb-004, tf-gr-upper-limb-005, tf-phys-muscle-001, tf-bc-enzymes-001, tf-phys-renal-structure-002, tf-phys-temperature-002, tf-phys-temperature-001
- Total bank: 89 stems
- Still draft/unverified: 82 stems

This is an initial targeted pass, not a complete audit of the bank. The remaining stems must be reviewed individually before their verification status changes. Reference presence alone does not qualify a stem as verified.


## Verification pass 2 — 2026-11-26

A further three stems were checked statement-by-statement against the cited NCBI Bookshelf sources: tf-pb-fluid-001, tf-bc-protein-001, tf-bc-protein-002. The verified count is now 10 of 89; 79 remain draft/unverified. No status was changed for stems not reviewed in this pass.
