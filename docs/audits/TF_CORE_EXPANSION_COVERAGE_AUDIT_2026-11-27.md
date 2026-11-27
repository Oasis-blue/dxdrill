# DxDrill true/false core expansion — coverage and data-quality audit

**Audit date:** 27 November 2026  
**Source:** `data/questions/tf-core-expansion.json` (blob SHA `25e3e4aa8bffac77a15f2c3e0ab69b930f19632a`)  
**Scope:** structural inventory and broad subject-domain coverage of the 448-stem bank. This is not a full FUHSO/MDCN syllabus mapping or a fresh academic verification of question content.

## Current inventory

| Measure | Result |
|---|---:|
| Total stems | 448 |
| Total statements | 1,792 |
| Statements per stem | 4 throughout |
| Duplicate IDs | 0 |
| Records with `type: "tf"` | 448 |
| Records with at least 2 references | 448 |
| Records with fewer than 2 references | 0 |
| Marked verified | 172 |
| Draft/unverified | 276 |

## Subject allocation

| Subject | Stems |
|---|---:|
| Anatomy (gross, histology, embryology) | 132 |
| Physiology | 142 |
| Medical Biochemistry | 136 |
| Pathology/pharmacology/other existing material | 38 |

The 38 additional records are not part of the three core subject totals; they include pathology, pharmacology and prescribing-related prefixes. Subject allocation is inferred from ID prefixes and should be checked against the bank's canonical subject taxonomy.

### Prefix distribution

**Anatomy**
- `emb`: 14
- `ga`: 27
- `gh`: 15
- `gr`: 35
- `se`: 16
- `sh`: 25

**Physiology**
- `pb`: 11
- `pc`: 16
- `pn`: 1
- `pe`: 8
- `pg`: 5
- `phys`: 57
- `pi`: 14
- `pl`: 10
- `pp`: 5
- `pr`: 15

**Medical Biochemistry**
- `ba`: 43
- `bc`: 93

## Remediation completed

The initial audit identified three metadata/reference issues. All have now been corrected in the source JSON:

1. **30 missing `type` fields:** restored to `"tf"`; all 433 records now carry the type.
2. **15 reference-free Round 13 records:** supplied with two subject-appropriate textbook references each.
3. **107 single-reference records:** retained their existing source and received a second subject-appropriate textbook reference.

The current structural scan finds no records with fewer than two references. These are textbook-level references, not claim-by-claim citations. Adding references does not establish that every statement is correct and does not itself confer verified status.

## Round 22 expansion

Round 22 added 15 stems / 60 statements, five per core subject, targeting the syllabus gaps identified in the companion coverage matrix. The new batch remains draft/unverified and carries at least two textbook-level references per stem.

## Verification status

172 records remain marked `verified` and 276 remain `draft-unverified`. Their statuses were not changed as part of metadata/reference cleanup. This audit did not re-check the medical accuracy of the 172 records already marked verified, nor did it promote any draft record.

## Coverage interpretation and priorities

- **Anatomy:** 132 stems span general and regional anatomy, histology, embryology and genetics. Counts alone do not prove balanced coverage. Map regional gross anatomy (head and neck, thorax, abdomen, pelvis/perineum, upper and lower limbs), neuroanatomy, organ-system histology, general histology, and early-to-late embryology as separate learning-objective groups.
- **Physiology:** 142 stems span general, blood/body fluids, cardiovascular, respiratory, renal, gastrointestinal, endocrine, reproductive, neuro-locomotor, skin and temperature domains. Map mechanisms and practical interpretation objectives, especially cardiovascular regulation, renal handling/acid-base, respiratory gas exchange, neurophysiology and reproductive physiology.
- **Medical Biochemistry:** 136 stems span general and applied biochemistry, including biomolecules, enzymes/bioenergetics, metabolism, amino-acid/protein metabolism, vitamins, nucleotides, haem, molecular biology and clinical applications. Explicitly map pathway integration and regulation, molecular biology/genetics, nutrition/minerals, inborn errors, and laboratory interpretation.
- **Additional pathology/pharmacology material:** 39 stems exist in the same file. Keep these outside the three-core-subject denominator and map them to their own syllabus when that expansion is resumed.

See the [syllabus-to-bank coverage matrix](TF_CORE_SYLLABUS_COVERAGE_MATRIX_2026-11-27.md) for NUC CCMAS course mapping, domain counts and remaining priorities.

## Canonical topic reconciliation — 27 November 2026

The source bank's 98 legacy topic assignments were reviewed individually and remapped to the closest current canonical topic based on each stem's content. `docs/topic-ids.txt` was synchronized with `data/curriculum.json` (358 IDs in both). A fresh bank-wide check found 0 invalid topic assignments across all 448 records. Question content and verification statuses were preserved. The True/False checker was also strengthened to reject a new import if any already-loaded bank record has a topic ID absent from the canonical curriculum.

## Recommended next step

Build a syllabus matrix at the learning-objective/subtopic level for Anatomy, Physiology and Medical Biochemistry using the current approved FUHSO/MDCN curriculum as the denominator. Mark each objective as absent, thin, adequate or needing expert review. The next 15-stem expansion should then target confirmed gaps, with five stems per core subject.

## Audit limitations

- Topic slugs and ID prefixes are useful indexing signals but are not a substitute for the official syllabus taxonomy.
- This pass checked record structure, metadata, reference counts and broad subject distribution; it did not fact-check all 1,732 statements.
- A complete syllabus-level audit requires the exact curriculum/syllabus document and a learning-objective mapping; no claim of full syllabus coverage is made here.
