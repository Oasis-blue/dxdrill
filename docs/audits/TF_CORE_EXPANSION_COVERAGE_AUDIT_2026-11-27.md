# DxDrill true/false core expansion — coverage and data-quality audit

**Audit date:** 27 November 2026  
**Source:** `data/questions/tf-core-expansion.json` (blob SHA `148502e7cf0aa30b0a88932105781e5c30b9da0f`)  
**Scope:** structural inventory and broad subject-domain coverage of the 433-stem bank. This is not a full FUHSO/MDCN syllabus mapping or a fresh academic verification of question content.

## Current inventory

| Measure | Result |
|---|---:|
| Total stems | 433 |
| Total statements | 1,732 |
| Statements per stem | 4 throughout |
| Duplicate IDs | 0 |
| Records with `type: "tf"` | 433 |
| Records with at least 2 references | 433 |
| Records with fewer than 2 references | 0 |
| Marked verified | 172 |
| Draft/unverified | 261 |

## Subject allocation

| Subject | Stems |
|---|---:|
| Anatomy (gross, histology, embryology) | 127 |
| Physiology | 136 |
| Medical Biochemistry | 131 |
| Pathology/pharmacology/other existing material | 39 |

The 39 additional records are not part of the three core subject totals; they include pathology, pharmacology and prescribing-related prefixes. Subject allocation is inferred from ID prefixes and should be checked against the bank's canonical subject taxonomy.

### Prefix distribution

**Anatomy**
- `emb`: 14
- `ga`: 23
- `gh`: 15
- `gr`: 34
- `se`: 16
- `sh`: 25

**Physiology**
- `pb`: 11
- `pc`: 16
- `pe`: 8
- `pg`: 5
- `phys`: 52
- `pi`: 14
- `pl`: 10
- `pp`: 5
- `pr`: 15

**Medical Biochemistry**
- `ba`: 43
- `bc`: 88

## Remediation completed

The initial audit identified three metadata/reference issues. All have now been corrected in the source JSON:

1. **30 missing `type` fields:** restored to `"tf"`; all 433 records now carry the type.
2. **15 reference-free Round 13 records:** supplied with two subject-appropriate textbook references each.
3. **107 single-reference records:** retained their existing source and received a second subject-appropriate textbook reference.

The current structural scan finds no records with fewer than two references. These are textbook-level references, not claim-by-claim citations. Adding references does not establish that every statement is correct and does not itself confer verified status.

## Verification status

172 records remain marked `verified` and 261 remain `draft-unverified`. Their statuses were not changed as part of metadata/reference cleanup. This audit did not re-check the medical accuracy of the 172 records already marked verified, nor did it promote any draft record.

## Coverage interpretation and priorities

- **Anatomy:** 127 stems span gross anatomy, histology and embryology. Counts alone do not prove balanced coverage. Map regional gross anatomy (head and neck, thorax, abdomen, pelvis/perineum, upper and lower limbs), neuroanatomy, organ-system histology, general histology, and early-to-late embryology as separate learning-objective groups.
- **Physiology:** 136 stems span cardiovascular, respiratory, renal, blood, gastrointestinal, endocrine, reproductive, nervous-system, muscle, special-sense and temperature domains. Map mechanisms and practical interpretation objectives, especially cardiovascular regulation, renal handling/acid-base, respiratory gas exchange, neurophysiology and reproductive physiology.
- **Medical Biochemistry:** 131 stems span biomolecules, enzymes/bioenergetics, carbohydrate and lipid metabolism, amino-acid/protein metabolism, vitamins, nucleotides, haem and clinical biochemistry. Explicitly map pathway integration and regulation, molecular biology/genetics, nutrition/minerals, inborn errors, and laboratory interpretation.
- **Additional pathology/pharmacology material:** 39 stems exist in the same file. Keep these outside the three-core-subject denominator and map them to their own syllabus when that expansion is resumed.

## Recommended next step

Build a syllabus matrix at the learning-objective/subtopic level for Anatomy, Physiology and Medical Biochemistry using the current approved FUHSO/MDCN curriculum as the denominator. Mark each objective as absent, thin, adequate or needing expert review. The next 15-stem expansion should then target confirmed gaps, with five stems per core subject.

## Audit limitations

- Topic slugs and ID prefixes are useful indexing signals but are not a substitute for the official syllabus taxonomy.
- This pass checked record structure, metadata, reference counts and broad subject distribution; it did not fact-check all 1,732 statements.
- A complete syllabus-level audit requires the exact curriculum/syllabus document and a learning-objective mapping; no claim of full syllabus coverage is made here.
