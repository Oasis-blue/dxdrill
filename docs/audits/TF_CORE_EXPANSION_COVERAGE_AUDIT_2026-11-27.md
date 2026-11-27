# DxDrill true/false core expansion — coverage and data-quality audit

**Audit date:** 27 November 2026  
**Source:** `data/questions/tf-core-expansion.json` (blob SHA `926913d106ffb02ec3f148b2d045652156c03e55`)  
**Scope:** structural inventory and broad subject-domain coverage of the current 433-stem bank. This is not a claim of full FUHSO/MDCN syllabus mapping or academic verification; that requires the exact approved syllabus and subject-expert review.

## Inventory

| Measure | Result |
|---|---:|
| Total stems | 433 |
| Total statements | 1,732 |
| Statements per stem | 4 throughout |
| Duplicate IDs | 0 |
| Marked verified | 172 |
| Draft/unverified | 261 |
| Missing `type: tf` | 30 |
| One reference only | 107 |
| No references | 15 |

## Subject allocation

| Subject | Stems |
|---|---:|
| Anatomy (gross, histology, embryology) | 127 |
| Physiology | 136 |
| Medical Biochemistry | 131 |
| Pathology/pharmacology/other existing material | 39 |

The 39 additional records are not part of the three core subject totals; they include pathology, pharmacology and prescribing-related prefixes. The subject allocation is inferred from ID prefixes and should be checked against the bank's canonical subject taxonomy.

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

## Data-quality findings

1. **30 records are missing the required `type` field.** These are legacy Anatomy, Physiology and Biochemistry records. Their IDs are:

- `tf-ga-vertebral-column-002`
- `tf-gr-pelvic-floor-002`
- `tf-ga-cranial-meninges-002`
- `tf-se-heart-septation-002`
- `tf-gh-cartilage-002`
- `tf-phys-hearing-002`
- `tf-phys-vision-002`
- `tf-phys-thyroid-002`
- `tf-pi-gastric-secretion-002`
- `tf-pc-microcirculation-002`
- `tf-bc-glycogen-002`
- `tf-bc-oxphos-002`
- `tf-bc-lipoproteins-002`
- `tf-bc-purine-002`
- `tf-bc-pyrimidine-002`
- `tf-gr-axilla-002`
- `tf-gr-mediastinum-002`
- `tf-gr-peritoneum-002`
- `tf-ga-hip-joint-002`
- `tf-gh-bone-histology-002`
- `tf-phys-nmj-002`
- `tf-pc-conduction-002`
- `tf-phys-acidbase-002`
- `tf-pi-intestinal-absorption-002`
- `tf-phys-exercise-002`
- `tf-bc-cholesterol-002`
- `tf-bc-glycogen-disorders-002`
- `tf-bc-glutathione-002`
- `tf-bc-onecarbon-002`
- `tf-bc-collagen-002`

2. **15 records have no references.** These are the 15-stem Round 13 batch:

- `tf-sh-special-senses-002`
- `tf-sh-skin-002`
- `tf-sh-male-genital-002`
- `tf-sh-digestive-002`
- `tf-sh-lymphoid-002`
- `tf-phys-gonadal-002`
- `tf-phys-reproduction-002`
- `tf-phys-lactation-002`
- `tf-phys-sleep-002`
- `tf-phys-posture-002`
- `tf-bc-tca-002`
- `tf-bc-urea-002`
- `tf-bc-ketones-002`
- `tf-ba-bilirubin-002`
- `tf-ba-plasma-protein-002`

3. **107 records have only one reference.** The bank's newer expansion convention expects at least two references. This needs a controlled reference-completion pass; do not invent claim-level citations or mark these records verified merely by adding a textbook title.

4. **No duplicate IDs were detected.** All records in this file contain four statements; answer values are boolean and explanations are present in the structural scan.

5. **Verification status is mixed by design.** 172 records are marked verified and 261 remain draft/unverified. A metadata/shape check cannot establish the medical accuracy of an item. Retain the unverified status until academic review is completed.

## Coverage interpretation and priorities

- **Anatomy:** 127 stems span gross anatomy, histology and embryology. The current count alone does not prove balanced coverage. The next syllabus mapping should explicitly check regional gross anatomy (head and neck, thorax, abdomen, pelvis/perineum, upper and lower limbs), neuroanatomy, organ-system histology, general histology, and early-to-late embryology. Histology and embryology need a separate subtopic-level audit rather than being inferred from their broad prefix counts.
- **Physiology:** 136 stems cover cardiovascular, respiratory, renal, blood, gastrointestinal, endocrine, reproductive, nervous-system, muscle, special-sense and temperature domains. A second pass should map each domain to mechanisms and practical interpretation objectives, especially cardiovascular regulation, renal handling/acid-base, respiratory gas exchange, neurophysiology and reproductive physiology.
- **Medical Biochemistry:** 131 stems cover biomolecules, enzymes/bioenergetics, carbohydrate and lipid metabolism, amino-acid/protein metabolism, vitamins, nucleotides, haem and clinical biochemistry. The next pass should explicitly test pathway integration and regulation, molecular biology/genetics, nutrition/minerals, inborn errors, and interpretation of laboratory findings.
- **Additional pathology/pharmacology material:** 39 stems exist in the same file. Keep these separate from the three core-subject coverage denominator and map them to their own syllabus when that expansion is resumed.

## Recommended sequence

1. Repair the 30 missing `type: tf` fields without changing question wording or answers.
2. Complete references for the 15 reference-free Round 13 stems, then review the 107 one-reference records in batches. Reference completion is not equivalent to academic verification.
3. Build a syllabus matrix at the learning-objective/subtopic level for Anatomy, Physiology and Medical Biochemistry, using the current FUHSO/MDCN curriculum as the denominator. Mark each objective as absent, thin, adequate or needing expert review.
4. Only then add the next 15-stem batch, selecting five per core subject from confirmed gaps rather than simply increasing totals.

## Audit limitations

- Topic slugs and ID prefixes are useful indexing signals but are not a substitute for the official syllabus taxonomy.
- This pass checked record structure, metadata, reference counts and broad subject distribution; it did not fact-check all 1,732 statements.
- The 172 records marked verified were not re-verified in this audit.

