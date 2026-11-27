# DxDrill true/false core expansion — coverage and data-quality audit

**Audit date:** 27 November 2026  
**Source:** `data/questions/tf-core-expansion.json` (blob SHA `33b5caea4f5105f4c75af30f91eb78a01d06ea89`)  
**Scope:** structural inventory and broad subject-domain coverage of the 493-stem bank. This is not a full FUHSO/MDCN syllabus mapping or a fresh academic verification of question content.

## Current inventory

| Measure | Result |
|---|---:|
| Total stems | 493 |
| Total statements | 1,972 |
| Statements per stem | 4 throughout |
| Duplicate IDs | 0 |
| Duplicate stem-wording groups | 22 (46 records involved) |
| Records with at least one direct HTTPS URL | 343 |
| Records with no direct HTTPS URL | 150 |
| Records with `type: "tf"` | 493 |
| Records with at least 2 reference entries | 488 |
| Records with fewer than 2 reference entries | 5 |
| Marked verified | 172 |
| Draft/unverified | 321 |

## Subject allocation

| Subject | Stems |
|---|---:|
| Anatomy (gross, histology, embryology, genetics and radiological anatomy) | 147 |
| Physiology | 157 |
| Medical Biochemistry | 151 |
| Pathology/pharmacology/other existing material | 38 |

The 38 additional records are not part of the three core subject totals; they include pathology, pharmacology and prescribing-related prefixes. Subject allocation is inferred from ID prefixes and should be checked against the bank's canonical subject taxonomy.

### Prefix distribution

**Anatomy**
- `emb`: 14
- `ga`: 27
- `gen`: 6
- `gh`: 15
- `gr`: 35
- `ra`: 7
- `se`: 17
- `sh`: 26

**Physiology**
- `pb`: 11
- `pc`: 17
- `pn`: 2
- `pe`: 8
- `pg`: 6
- `phys`: 64
- `pi`: 15
- `pl`: 10
- `pp`: 8
- `pr`: 16

**Medical Biochemistry**
- `ba`: 56
- `bc`: 95

## Remediation completed

The initial audit identified three metadata/reference issues. All have now been corrected in the source JSON:

1. **30 missing `type` fields:** restored to `"tf"`; all 463 records now carry the type.
2. **15 reference-free Round 13 records:** supplied with two subject-appropriate textbook references each.
3. **107 single-reference records:** retained their existing source and received a second subject-appropriate textbook reference.

The current inventory shows that every record has at least one reference entry and 488 have two or more entries. However, 343 records have at least one direct HTTPS source URL; 150 currently list textbook titles without a direct URL. This is a source-link provenance gap, not proof that the questions lack textbooks or are medically incorrect. Separately, 22 stem-wording groups are duplicated (46 records affected; 24 excess occurrences). These duplicates pre-date Round 23; none of the 15 new stems duplicates an existing stem heading. These are textbook-level references, not claim-by-claim citations. Adding references does not establish that every statement is correct and does not itself confer verified status.

## Round 22 expansion

Round 22 added 15 stems / 60 statements, five per core subject, targeting the syllabus gaps identified in the companion coverage matrix. The new batch remains draft/unverified and carries at least two textbook-level references per stem.

## Verification status

172 records remain marked `verified` and 321 remain `draft-unverified`. Their statuses were not changed as part of metadata/reference cleanup. This audit did not re-check the medical accuracy of the 172 records already marked verified, nor did it promote any draft record.

## Coverage interpretation and priorities

- **Anatomy:** 147 stems span general and regional anatomy, histology, embryology, genetics and radiological anatomy. Counts alone do not prove balanced coverage. Map regional gross anatomy (head and neck, thorax, abdomen, pelvis/perineum, upper and lower limbs), neuroanatomy, organ-system histology, general histology, and early-to-late embryology as separate learning-objective groups.
- **Physiology:** 157 stems span general, blood/body fluids, cardiovascular, respiratory, renal, gastrointestinal, endocrine, reproductive, neuro-locomotor, skin and temperature domains. Map mechanisms and practical interpretation objectives, especially cardiovascular regulation, renal handling/acid-base, respiratory gas exchange, neurophysiology and reproductive physiology.
- **Medical Biochemistry:** 151 stems span general and applied biochemistry, including biomolecules, enzymes/bioenergetics, metabolism, amino-acid/protein metabolism, vitamins, nucleotides, haem, molecular biology and clinical applications. Explicitly map pathway integration and regulation, molecular biology/genetics, nutrition/minerals, inborn errors, and laboratory interpretation.
- **Additional pathology/pharmacology material:** 38 stems exist in the same file. Keep these outside the three-core-subject denominator and map them to their own syllabus when that expansion is resumed.

See the [syllabus-to-bank coverage matrix](TF_CORE_SYLLABUS_COVERAGE_MATRIX_2026-11-27.md) for NUC CCMAS course mapping, domain counts and remaining priorities.

## Six-stem topic-depth target

Across the 119 core Anatomy, Physiology and Medical Biochemistry topics, 96 have fewer than six stems and none is currently empty. Anatomy: 47 below six; Physiology: 49 below six; Medical Biochemistry: none below six. Round 25 added the first stem to `gen-basic-genetic-counselling`; the six-stem target remains active.

## Round 23 expansion — 27 November 2026

Fifteen new stems (five each in Anatomy, Physiology and Medical Biochemistry) were added, taking the bank to 463 stems / 1,852 statements. They remain draft/unverified. The selected topics were chosen from low-count areas in the canonical curriculum inventory.

## Round 24 expansion — 27 November 2026

Fifteen new stems (five each in Anatomy, Physiology and Medical Biochemistry) were added, taking the bank to 478 stems / 1,912 statements. All 15 remain draft/unverified, each has four statements and at least one direct HTTPS source. The new Anatomy stems cover the four previously empty radiological topics and common genetic disorders. Round 25 subsequently filled the last empty topic, basic genetic counselling, with one draft stem. Selected imaging/genetics references were cross-checked and mismatched source targets corrected before the final inventory.

## Canonical topic reconciliation — 27 November 2026

The source bank's 98 legacy topic assignments were reviewed individually and remapped to the closest current canonical topic based on each stem's content. `docs/topic-ids.txt` was synchronized with `data/curriculum.json` (358 IDs in both). A fresh bank-wide check found 0 invalid topic assignments across all 463 records. Question content and verification statuses were preserved. The True/False checker was also strengthened to reject a new import if any already-loaded bank record has a topic ID absent from the canonical curriculum.

## Recommended next step

Resolve the 150 missing direct-URL cases by adding topic-appropriate source links after checking that each link supports the associated material. Review the 22 duplicated stem-wording groups for genuine overlap; retain separate stems only where their statement-level learning objectives are meaningfully different. Do not promote verification status during metadata-only cleanup.

Build a syllabus matrix at the learning-objective/subtopic level for Anatomy, Physiology and Medical Biochemistry using the current approved FUHSO/MDCN curriculum as the denominator. Mark each objective as absent, thin, adequate or needing expert review. The next 15-stem expansion should then target confirmed gaps, with five stems per core subject.

## Audit limitations

- Topic slugs and ID prefixes are useful indexing signals but are not a substitute for the official syllabus taxonomy.
- This pass checked record structure, metadata, reference counts and broad subject distribution; it did not fact-check all 1,852 statements.
- A complete syllabus-level audit requires the exact curriculum/syllabus document and a learning-objective mapping; no claim of full syllabus coverage is made here.


## Round 25 expansion — 27 November 2026

Fifteen new stems (five each in Anatomy, Physiology and Medical Biochemistry) were added, taking the bank to 493 stems / 1,972 statements. All 15 remain draft/unverified, each has four statements, mixed true/false keys and at least one direct HTTPS reference. The Anatomy batch filled the final empty core topic, basic genetic counselling, and added radiology/genetics depth. Physiology additions target hypoxia, renal testing, micturition, urine concentration and dialysis. Biochemistry additions deepen lipid chemistry, catecholamine metabolism, muscle fuel use, fibrinolysis and membrane organisation. The current core inventory has 96 topics below six stems and no empty topics.
