# DxDrill — First Professional MBBS syllabus-to-bank coverage matrix

**Date:** 27 November 2026  
**Question-bank source:** `data/questions/tf-core-expansion.json`  
**Source blob SHA:** `b03746648e9c6c60272634ca343079ef1796c444`  
**Bank scope:** 448 stems / 1,792 true-false statements. Counts below include both verified and draft/unverified stems.

## 1. Curriculum baseline and provenance

The matrix uses the **NUC Core Curriculum and Minimum Academic Standards (CCMAS) 2023, Medicine and Dentistry** as the current national programme-level reference. Its Medicine and Surgery course map places the first-professional basic medical science courses across 200- and 300-level Anatomy, Physiology and Medical Biochemistry. The NUC describes CCMAS as a national minimum/core framework, with institutions retaining room for institution-specific curriculum design. See the official [NUC CCMAS page](https://www.nuc.edu.ng/ccmas/) and the [Medicine and Dentistry CCMAS PDF](https://www.nuc.edu.ng/wp-content/uploads/2026/03/Medicine-and-Dentistry-CCMAS-2023-FINAL.pdf).

The **MDCN Guidelines on Minimum Standards of Medical and Dental Education in Nigeria (Red Book, revised June 2006)** provide a second national reference for the breadth of the basic medical sciences. The Red Book explicitly includes general, regional/gross, microscopic/histological and developmental/embryological anatomy, plus genetics; its physiology and biochemistry sections give broader subject content and practical expectations. It is older than the 2023 CCMAS and is used here as a complementary minimum-standards reference, not as a replacement for the newer NUC programme map. [Official MDCN Red Book PDF](https://www.mdcnigeria.org/downloads/copy-of-guideline-on-minimum-standard-red-book.pdf).

**FUHSO-specific limitation:** no confirmed FUHSO curriculum document was present in the project's earlier document inventory. The matrix is therefore a national-baseline comparison, not a claim that it reproduces FUHSO's approved local syllabus. Past papers and in-course documents can establish local teaching/exam emphasis, but they cannot by themselves establish the complete official curriculum.

The user's three-subject structure is retained: **Anatomy includes Histology and Embryology**; Physiology and Medical Biochemistry remain separate subjects.

## 2. Overall bank inventory

| Subject | Stems | Share of three core subjects |
|---|---:|---:|
| Anatomy (including Histology and Embryology) | 132 | 32.3% |
| Physiology | 141 | 34.5% |
| Medical Biochemistry | 136 | 33.3% |
| **Core-subject total** | **409** | **100%** |

The additional 39 pathology/pharmacology/other stems in the same JSON file are excluded from this three-subject denominator.

## 3. Anatomy coverage

NUC course anchors include ANA 201a/201b (upper and lower limbs), ANA 202a/202b (thorax/abdomen and pelvis/perineum), ANA 203/204 (basic and systemic histology), ANA 205/206 (general and systemic embryology), and ANA 301/303/305/307/309 (head and neck/neuroanatomy, special-sense and neuro-histology, neuro-embryology/pharyngeal apparatus, genetics, and microscopy/radiological techniques).

| Broad domain, inferred from question ID prefixes | Stems | Initial assessment |
|---|---:|---|
| General/structural anatomy (GA) | 27 | Present; depth varies by subtopic |
| Regional gross anatomy (GR) | 35 | Present; depth varies by subtopic |
| Embryology (EMB+SE) | 30 | Present; depth varies by subtopic |
| Histology (GH+SH) | 40 | Present; depth varies by subtopic |
| Dedicated human genetics/inheritance and genetic counselling | 2 | **Present but very thin** |
| Dedicated radiological anatomy/imaging interpretation | 2 | **Present but very thin** |
| Living/surface anatomy | 1 explicitly tagged | **Very thin** |

**Interpretation:** The bank has broad gross-anatomy, histology and embryology coverage, but the prefix counts do not prove adequate regional balance. The new Round 22 batch adds two dedicated genetics stems and two radiological anatomy stems, but both areas remain very thin. Genetics material within Medical Biochemistry should not be counted as a substitute for the Anatomy/medical genetics learning objectives. The 40 histology stems and 30 embryology stems should next be checked against each organ system and developmental sequence, not treated as complete merely because the umbrella domains are represented.

## 4. Physiology coverage

NUC course anchors include PHS 201 (introductory/cell physiology and autonomic nervous system), PHS 203 (blood), PHS 205 (cardiovascular), PHS 202 (renal physiology/body fluids/temperature), PHS 204 (respiratory), PHS 206 (neuroscience), PHS 301 (gastrointestinal), PHS 303 (endocrinology/reproduction), PHS 307 (laboratory teaching/instrumentation) and PHS 309 (neuroendocrinology).

| Domain, assigned by primary topic prefix/subtopic | Stems | Initial assessment |
|---|---:|---|
| General/cell/homeostasis | 5 | Thin |
| Neuro-locomotor | 21 | Present; check objective-level depth |
| Blood and body fluids | 16 | Present; check objective-level depth |
| Renal/urinary/acid-base/fluid | 19 | Present; check objective-level depth |
| Temperature/skin/exercise | 5 | Thin |
| Respiratory | 14 | Present; check objective-level depth |
| Cardiovascular | 19 | Present; check objective-level depth |
| Gastrointestinal/nutrition | 14 | Present; check objective-level depth |
| Endocrine | 14 | Present; check objective-level depth |
| Reproductive | 10 | Present but needs depth |
| Special senses | 4 | Thin |

**Additional gap/quality flags:**
- The special-senses group now has four stems after Round 22, but visual and auditory physiology still need deeper objective-level coverage.
- Temperature/skin/exercise is a small combined cluster. These are distinct learning areas and should not be allowed to mask one another.
- PHS 307 practical/laboratory instrumentation and practical interpretation are not comprehensively represented by a few ECG, spirometry or laboratory-related question stems. A dedicated practical-objective audit is needed.
- The 21 neuro-locomotor stems cover a broad domain, but the separate objectives (ANS, nerve conduction, synapses/NMJ, spinal cord, cerebellum, basal ganglia, cerebrum, posture, EEG/sleep and special senses) require individual checking.

## 5. Medical Biochemistry coverage

NUC course anchors include BCH 201 (cell biology, pH and buffers), BCH 203 (carbohydrate chemistry), BCH 205 (amino-acid chemistry), BCH 209 (lipid metabolism), BCH 202 (nucleic-acid chemistry), BCH 204 (enzymes/coenzymes/bioenergetics), BCH 206 (amino-acid metabolism), BCH 208 (carbohydrate metabolism), BCH 301 (nucleic-acid metabolism/protein synthesis), BCH 303 (integration of metabolism), BCH 305 (nutrition), BCH 307 (biochemical genetics/molecular biology) and BCH 309 (special topics).

| Domain, assigned by primary subtopic | Stems | Initial assessment |
|---|---:|---|
| Enzymes and bioenergetics | 13 | Present; check objective-level depth |
| Carbohydrate/energy pathway integration | 15 | Present; check objective-level depth |
| Amino acids, proteins and nitrogen metabolism | 23 | Present; check objective-level depth |
| Nucleic acids, molecular biology and genetics | 18 | Present; check objective-level depth |
| Lipid metabolism | 9 | Present but needs depth |
| Vitamins, minerals and nutrition | 10 | Present but needs depth |
| Applied/special topics | 38 | Present; check objective-level depth |
| Basic chemistry, biomolecules and membranes | 10 | Present but needs depth |

**Interpretation:** Applied/special topics form a large share of the current Biochemistry set. This is useful, but it should not crowd out pathway-level learning outcomes. The next audit should check individual pathway steps, rate-limiting enzymes, regulation, tissue specificity, fed/fasting integration, nutritional assessment and practical interpretation. The counts above are a primary classification by each stem's subtopic; they are not counts of distinct learning outcomes.

## 6. Priority gaps for the next expansion

These are priority candidates from the national-baseline comparison, not a claim that every item is absent from the full curriculum or from all uploaded teaching materials.

### Anatomy
1. Human genetics: chromosomes, inheritance patterns, common genetic disorders and genetic counselling.
2. Radiological anatomy: interpretation of normal plain radiographs, CT, ultrasound and relevant contrast studies.
3. Living/surface anatomy and examination-oriented landmarks.
4. Subtopic-level balancing of head/neck, neuroanatomy, pelvis/perineum and regional limbs.
5. System-by-system audit of histology and embryology against ANA 203/204/205/206/303/305.

### Physiology
1. Special senses: visual and auditory pathways, transduction and reflexes.
2. Practical/laboratory competencies: haematological indices, blood grouping/crossmatching, spirometry, ECG, renal function and interpretation of physiological recordings.
3. Neuroendocrinology and integrated hypothalamic-pituitary control.
4. Separate depth checks for temperature regulation, skin physiology, exercise physiology and nutrition/energy expenditure.
5. Ensure every reproductive, renal and cardiovascular course outcome has more than a token stem.

### Medical Biochemistry
1. Nutrition: dietary assessment, energy balance, malnutrition and clinical deficiency states; Round 22 added two nutrition-focused stems.
2. Metabolic integration: organ-specific and fed/fasting regulation across carbohydrate, lipid and amino-acid metabolism; Round 22 added two integration-focused stems.
3. Biochemical genetics and molecular biology: gene expression, genetic diagnosis and clinically relevant inheritance; Round 22 added one biochemical-genetics stem.
4. Clinical/practical interpretation: enzyme assays, glucose tolerance/HbA1c, electrophoresis, body-fluid chemistry and nutrition-related tests.
5. Confirm coverage of each BCH 309 special-topic area without over-relying on broad umbrella stems.

## 7. Round 22 completed and next priorities

Round 22 added 15 stems / 60 statements, five per core subject, selected from the gaps in the first matrix:
- **Anatomy:** two human-genetics/inheritance stems, two radiological-anatomy stems, one living/surface-anatomy stem.
- **Physiology:** visual and auditory physiology, ECG and spirometry interpretation, and hypothalamic-pituitary integration.
- **Medical Biochemistry:** nutritional assessment, micronutrient deficiency, fed/fasting regulation, inter-organ fuel exchange, and biochemical genetics.

The next batch should deepen the still-thin areas rather than repeat Round 22 topics. Compare each proposed learning objective against existing stems and individual statements before committing to avoid near-duplicates.

## 8. Method and limitations

- Subject membership is inferred from the question ID prefix; the 39 pathology/pharmacology/other records are excluded from the core subject analysis.
- Anatomy domain counts use the existing prefix families: GA, GR, GH, SH, EMB and SE. Physiology domains use topic-prefix/subtopic assignment. Biochemistry uses a primary subtopic keyword assignment. These are reproducible inventory groupings, not official NUC course-code assignments.
- Some question stems address more than one learning objective. The tables assign each stem to one primary bucket to avoid double-counting.
- Counts include draft/unverified questions. They indicate that content exists, not that it is academically correct or adequate.
- No item-level correctness review was performed in this syllabus-mapping pass.
- The NUC CCMAS permits institution-level curriculum design within its national framework; therefore, obtain FUHSO's approved current course outline before labelling this matrix a definitive FUHSO syllabus audit.
