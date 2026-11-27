# DxDrill uploaded-document to question-bank reconciliation

**Audit date:** 27 November 2026  
**Repository:** `Oasis-blue/dxdrill`  
**Branch:** `main`  
**Scope:** the 20-PDF upload batch from 26 November, reconciled against the current question-bank manifest and the source-reconciliation log. This is a coverage-status audit, not an academic answer-key review.

## Executive result

- **20 uploaded PDF files** represent **16 distinct byte-level sources**.
- There are **four exact duplicate pairs**. A further 5,000-MCQ Biochemistry PDF has different PDF bytes but text extraction identical to the G. Vidya Sagar source, giving **15 distinct extracted text contents**.
- The repository source log records **313 cumulative original, independently worded, source-informed question additions** as of this audit. This is not 313 verbatim imports and is not proof that all questions in the source books have been reconciled.
- **No source qualifies as fully reconciled question by question.**
- All source-reconciliation additions are recorded as unverified pending academic review; structural validation does not establish academic correctness.

## 1. Fully reconciled

**None.**

A source is only considered fully reconciled when its in-scope question content has been reviewed against the existing bank, duplicates and omissions have been checked, and any genuine gaps have been filled. Text extraction, OCR, a chapter map, or a small number of new questions does not meet this standard.

## 2. Partially reviewed / targeted question additions recorded

| Distinct source | Existing bank destinations / scope | Evidence and remaining limitation |
|---|---|---|
| `mcq_physio GIT 1.pdf` (10 pp.) | `pi-motor-functions-of-the-gi-tract`, `pi-digestion-and-absorption`, `pi-accessory-organs`, related GIT physiology banks | GIT hormones, enteric plexuses and gastric emptying were reviewed; targeted original questions were added. It overlaps the Elhariry scan. Not page-complete. |
| `#mcq_physio git 1,2,3 elhariry.pdf` (11 pp.) | GIT motility and digestion/absorption banks | OCR was used to inspect the GIT section and identify overlap; later targeted motility gaps were filled. Not every item was reconciled. |
| `808973599-100-MCQs-of-Excitable-Tissues.pdf` (13 pp.) | `pl-excitable-tissues-and-action-potentials` | Action-potential and refractory-period concepts reviewed; two original questions recorded. Not page-complete. |
| `14_test_bank_cardiovascular_physiology_mcq_test_bank_with_answers.pdf` (45 pp.) | `pc-cardiac-muscle-and-the-cardiac-cycle` and related cardiovascular banks | Cardiac-cycle and later valve-support/pericardial-lubrication gaps were targeted. Not a question-by-question reconciliation of all 45 pages. |
| `MCQ- Motor function of CNS (1).pdf` (20 pp.) | `pl-control-of-posture-and-movement` and related neurophysiology banks | Cerebellar and basal-ganglia concepts reviewed; targeted original questions added. Not page-complete. |
| `Upper Limb MCQs.pdf` (48 pp.) | `gr-upper-limb` | Two original questions recorded; the duplicate upload is excluded. No page-complete matching. |
| `3rd_Lower_Limb_mcqs.pdf` (55 pp.) | `gr-lower-limb` | Regional concepts reviewed and targeted gaps added, including small-saphenous-vein termination. Not page-complete. |
| `Head and neck MCqs and answers (1)(1).pdf` (22 pp.) | `gr-head-face-and-neck` | Orbit/carotid-sheath concepts reviewed; targeted additions recorded. Not page-complete. |
| `MCQs in Anatomy Thorax, Abdomen, Pelvis and Perineum(1).pdf` (138 pp.) | `gr-thorax`, `gr-abdomen-pelvis-and-perineum` | Initial additions were thorax-focused; later regional additions exist. The source as a whole has not been reconciled page by page. |
| `Klm Anatomy Mcqs (1).pdf` (157 pp.) | `ga-bones-and-joints`, `gr-upper-limb`, `gr-thorax`, `gr-abdomen-pelvis-and-perineum`, `gr-lower-limb`, `gr-head-face-and-neck` | Chapter map reviewed. A specific C1–C2 intervertebral-disc gap was filled; regional banks already cover many listed themes. The seven sections have not all been reconciled item by item. |
| `Anatomy MCQ.pdf` (336 pp., image-only) | `gr-head-face-and-neck`, `gr-neuroanatomy`, `gr-abdomen-pelvis-and-perineum`, `gr-lower-limb`, `gr-thorax`, histology, joints and embryology banks | **336/336 pages OCR-processed**; OCR-derived section ranges recorded in the source log. Targeted additions were made from selected sections. The OCR text is a working extraction, not a validated question list; full page/question matching remains outstanding. |
| `Physiology MCQs Book (1).pdf` (433 pp.) | Broad physiology banks, including cell/membrane, cardiovascular, renal, respiratory, nervous, GIT and endocrine/reproductive topics | Text extraction and chapter/scope mapping recorded. The book has not been reconciled question by question. Its duplicate upload is excluded. |

## 3. Extracted / scope-mapped, but systematic question reconciliation still outstanding

| Distinct source | Existing bank destinations / scope | Current status |
|---|---|---|
| `Anatomy MCQ ( PDFDrive ).pdf` (145 pp.) | Regional gross-anatomy banks: thorax, abdomen/pelvis/perineum, head/neck and limbs | Text extracted and contents mapped broadly to existing banks. Full question-by-question comparison remains outstanding. |
| `mcqs and emqs in physiology - Copy.pdf` (361 pp.) | Physiology banks across body fluids, cardiovascular, respiratory, alimentary, neuromuscular, special senses, urinary, endocrine and reproductive systems | Text extracted; contents identify MCQ and EMQ sections (714 numbered items in the contents map). Individual MCQ/EMQ reconciliation remains outstanding. |
| `MCQs in Biochemistry - by G. Vidya Sagar-Ussama Maqbool--1.pdf` (301 pp.) | `bc-*` and `ba-*` Biochemistry banks, including carbohydrates, proteins/amino acids, lipids, vitamins, enzymes, minerals, hormones, nucleic acids and water/electrolytes | Text extracted and chapter scope mapped. The large collection has not been reconciled question by question; no bulk transcription was performed. |
| `5000 MCQs-in-Biochemistry.pdf` (301 pp.) | Same Biochemistry bank scope as the G. Vidya Sagar source | Different PDF bytes, but extracted text is byte-for-byte identical to the G. Vidya Sagar source. It adds no distinct text coverage and must not be counted as a second independent question source. |

## 4. Duplicate handling

The following are exact duplicate pairs and count once each:

- `Klm Anatomy Mcqs (1).pdf` / `Klm Anatomy Mcqs (1)(1).pdf`
- `Physiology MCQs Book (1).pdf` / `Physiology MCQs Book (1)(1).pdf`
- `Upper Limb MCQs.pdf` / `Upper Limb MCQs(1).pdf`
- `MCQs in Biochemistry - by G. Vidya Sagar-Ussama Maqbool--1.pdf` / `epdf.tips_mcqs-in-biochemistry-2008.pdf`

The separate `5000 MCQs-in-Biochemistry.pdf` is not byte-identical, but its extracted text is identical to the G. Vidya Sagar source. It is therefore a separate PDF file but not a separate textual question source.

## 5. Reconciliation additions and validation

The source-reconciliation log records **313 cumulative original questions added** by the latest recorded pass. The questions are independently worded and placed in existing topic banks; the commercial books were not bulk-copied.

The logged validation includes JSON parsing, unique question IDs within affected files, non-empty stems, four options, valid answer indices and explanations. A spot-check against the current `main` branch also confirmed the current bank files and topic IDs for the latest logged additions.

**Important:** these are structural checks only. They do not confirm that every answer and explanation is academically correct, nor do they prove that every source question has been matched. The new source-informed questions remain `verified: false` pending human academic review.

## 6. Work required to close the reconciliation

1. Build page/question inventories for the 336-page Anatomy scan, the 145-page PDFDrive Anatomy book, KLM, the 433-page Physiology MCQ book, the 361-page Physiology MCQ/EMQ book and the Biochemistry collection.
2. Match each in-scope source item to an existing DxDrill question or mark it as a genuine gap, duplicate, out-of-scope item or unreadable/uncertain item.
3. Check MCQ and EMQ coverage separately; do not treat a broad topic match as a matched question.
4. Add only independently worded questions for genuine syllabus-relevant gaps, using the existing topic IDs and question-file conventions.
5. Re-run duplicate, ID, schema and structural validation after any additions.
6. Keep all new material unverified until an academic reviewer checks the complete stem, answer and explanation.

## Audit conclusion

The uploaded documents have been inventoried, deduplicated, text-extracted where possible, and used for substantial targeted question-bank expansion. The 336-page Anatomy scan has also been OCR-processed in full. **The document-ingestion project is not finished:** no source has yet passed a complete question-by-question reconciliation. The next substantive work is source-item matching and omission checking, not another untracked round of general question expansion.


## 7. First source-level cross-check — the two GIT PDFs

The two GIT uploads were checked against the current committed GIT physiology banks:

- `mcq_physio GIT 1.pdf`: 10 pages of extracted text, with 37 numbered items. Repeated concepts/questions occur within the source (including repeated gastrin, GIT-hormone and secretin/CCK items), so the printed item count is not the number of unique learning points.
- `#mcq_physio git 1,2,3 elhariry.pdf`: 11 scanned pages. A fresh page-by-page OCR pass recovered its GIT questions, but the OCR is imperfect. The later pages substantially repeat the separate GIT PDF; the scan also contains additional salivary, mastication and swallowing questions.

### Existing-bank matches confirmed

The current `pi-motor-functions-of-the-gi-tract.json` has 22 questions and directly covers:
- Myenteric and submucosal plexus functions (`-003`, `-004`).
- Secretin, CCK, GIP and gastrin regulation (`-005` to `-008`, `-010`, `-019`, `-020`).
- VIP-mediated smooth-muscle relaxation (`-009`).
- Swallowing, upper/lower oesophageal sphincter responses and mastication (`-011` to `-014`).
- Salivary neural control, flow-related ionic changes and lubrication (`-015` to `-017`).
- Segmentation, vomiting-associated reverse peristalsis and the migrating motor complex (`-018`, `-021`, `-022`).

Related coverage exists in:
- `pi-digestion-and-absorption.json` (10 questions),
- `pi-accessory-organs.json` (9 questions), and
- `pe-pancreas.json` (4 questions).

### GIT source gaps still requiring a decision

The source comparison identifies areas not directly represented, or only indirectly represented, in those banks:

- Overall sympathetic/parasympathetic control of GIT activity and the specific effects of sympathetic stimulation.
- Factors affecting lower oesophageal sphincter tone and the detailed control of gastric emptying.
- Gastrin-releasing peptide (GRP), vagal stimulation of G cells, and the broader classification/actions of gastrointestinal hormones.
- Somatostatin's inhibitory effects and the endocrine/paracrine/neurocrine distinctions.
- Additional salivary physiology: conditioned reflexes, saliva composition, salivary amylase and the relative contribution of the major glands.
- Mastication and swallowing details not yet represented directly, including trigeminal motor supply and the cranial-nerve motor sequence.
- Selected gastrin/secretin facts (sites of secretion, transport/action, and physiological regulation) where source wording is reliable.

These are **candidate gaps**, not automatic instructions to add one question for every source item. Some source items repeat one another, some OCR wording is uncertain, and several concepts may already be tested in other subject banks. New questions should be added only after checking the full candidate stem and answer for accuracy and ensuring they are not duplicates.

**Disposition:** both GIT PDFs are partially reconciled; neither is complete. The duplicated upload copies are not treated as separate sources. No verbatim source questions were imported during this cross-check.


## Source-level reconciliation update — Anatomy MCQ (PDFDrive), 27 November 2026

**Source identity correction:** the accessible Library file is `Anatomy MCQ ( PDFDrive ).pdf`, a 145-page Bartoș et al. monograph titled *Anatomy MCQ: Thorax, Abdomen and Pelvis* (2018). It is not the separate 336-page scanned file previously listed as `Anatomy MCQ.pdf`. The 336-page scan is not currently available in the active conversation files or searchable Project Library, so it remains pending access. The 145-page PDFDrive source was used for this first Anatomy comparison instead.

**Work completed:** the full 145-page PDF was locally text-extracted for review. Chapters 1–2 (Thoracic Wall; Abdomino-Pelvic Wall and Diaphragm; printed pages 11–22) were compared by concept against the live Anatomy banks. The source's questions were not copied verbatim. Existing matches include thoracic cage/rib and intercostal content in `gr-thorax` (e.g. `GRTH-01`, `GRTH-03`, `GRTH-04`, `GRTH-06`, `GRTH-51`) and diaphragm/abdominal-wall content in `gr-abdomen-pelvis-and-perineum` (e.g. `APP-02`, `APP-03`, `APP-53`, `APP-54`, `APP-55`, `APP-127`). These are concept-level matches, not assertions that each source MCQ has a one-to-one identical bank item.

**Confirmed targeted additions (11):**

| Bank file | New IDs | Coverage added |
|---|---|---|
| `data/questions/gr-thorax.json` | `GRTH-80`–`GRTH-83` | Superior and inferior thoracic aperture boundaries; intrinsic thoracic wall muscle group and its nerve supply |
| `data/questions/gr-thorax.json` | `GRTH-84`–`GRTH-86` | Serratus anterior/long thoracic nerve and scapular winging; trapezius attachments and motor supply; pectoralis minor attachments and nerve supply |
| `data/questions/gr-abdomen-pelvis-and-perineum.json` | `APP-218`–`APP-221` | Oesophageal hiatus contents; diaphragm arterial supply; linea alba formation; posterior rectus sheath above the arcuate line |

The new questions use the existing topic IDs and JSON schema. Where the source's wording or keyed answer was imprecise, the added question was corrected against standard anatomical descriptions rather than reproducing the source error. No existing question was renamed or overwritten.

**Verification:** both updated JSON files were re-fetched from `main` after the writes. `gr-thorax` now contains 86 questions; `gr-abdomen-pelvis-and-perineum` now contains 218 questions. The changes were committed separately:
- Thoracic additions: `2fb62191cdb298054e8cc5939dba2bd3babdeb26`
- Abdominal/diaphragm additions: `9f1f74a6fb7cc16587f942a9dbb27309362b4a26`

**Remaining scope:** this is only the first two chapters of the 145-page PDFDrive source. Chapters 3–25 remain to be reconciled, and the separate 336-page scanned Anatomy PDF remains inaccessible in the current file context. Therefore this update does not mark the 145-page source or the Anatomy document collection as fully reconciled.


### Follow-on review — Breast and Mediastinum (chapters 3–4)

Chapters 3–4 of the 145-page PDFDrive source were then reviewed against `gr-thorax`. The breast chapter's main existing matches included the retromammary plane (`GRTH-53`) and predominant axillary lymph drainage (`GRTH-54`). Three additional gaps were filled:
- `GRTH-87`: suspensory (Cooper) ligaments and their clinical relevance.
- `GRTH-88`: principal arterial sources of the breast.
- `GRTH-89`: initial lymphatic drainage from the lateral breast.

The mediastinum chapter's core material was already represented across the current bank, including mediastinal divisions and contents, the azygos system, thoracic duct, recurrent laryngeal nerve, and posterior mediastinal structures (e.g. `GRTH-18`–`GRTH-20`, `GRTH-32`, `GRTH-35`, `GRTH-47`, `GRTH-50`, `GRTH-59`, `GRTH-72`, `GRTH-73`, `GRTH-76`, `GRTH-79`). No additional question was added from this chapter in this pass; this is a concept-level check, not a full item-by-item sign-off.

The thoracic bank now contains 89 questions. The three breast additions follow the established `GRTH-##` convention and were appended without changing existing records.


### Follow-on review — Lungs and Pleura, Trachea and Bronchi, Heart and Pericardium, Oesophagus (chapters 5–8)

The next four source chapters (printed pages 31–49) were reviewed from the raw 145-page PDF. Existing coverage was identified for lung surfaces and lobes, pleural pain/recesses, aspiration anatomy, lung root components, bronchopulmonary segments, cardiac chambers and coronary arteries, pericardial sinuses, and the recurrent laryngeal nerve. Six further questions were added to broaden and deepen coverage rather than simply reproduce the source's MCQs:

- `GRTH-90`: pulmonary ligament and its role at the lung root.
- `GRTH-91`: bronchial (systemic) arterial supply of conducting and supporting lung tissues.
- `GRTH-92`–`GRTH-93`: tracheal bifurcation level and the carina.
- `GRTH-94`: fibrous skeleton of the heart—valvular support and electrical insulation.
- `GRTH-95`: clinically relevant oesophageal constrictions.

These additions extend the question bank beyond the exact source prompts while remaining within the chapter learning objectives. The source's multiple-response answer keys were not copied as authoritative where wording or anatomy required qualification.

**Updated thoracic bank count:** 95 questions. New records use sequential `GRTH-##` IDs and the existing JSON question schema. Chapters 9–25 of this source remain to be reviewed; no whole-document completion claim is made.


### Follow-on review — Stomach through Liver (chapters 9–13)

Printed pages 50–80 were reviewed against the live abdominal/pelvic bank. The source chapters cover the stomach; duodenum, jejunum and ileum; colon; rectum and anus; and liver. Existing bank coverage already included gastric arterial supply and ulcer relationships, duodenal anatomy and the major papilla, jejunal/ileal distinctions, appendicular and colonic arterial supply, the colonic watershed region, rectal venous drainage, and major hepatic landmarks and portal structures. This was a concept-level reconciliation, not a claim that every source MCQ has been individually paired with a bank record.

Four additional questions were added to broaden depth beyond the source's exact prompts:
- `APP-222`: gastric lymphatic drainage and its relevance to regional nodal spread in gastric carcinoma.
- `APP-223`: ileal Peyer patches and mucosal immune surveillance.
- `APP-224`: the bare area of the liver and its peritoneal boundaries.
- `APP-225`: mesorectal fascia and the surgical plane used in total mesorectal excision.

### Follow-on review — Pancreas, Spleen, Kidney and Ureters (chapters 15–17)

Printed pages 86–102 were reviewed against the same bank. Existing coverage included pancreatic relations and the uncinate process, splenic ligaments and vessels, renal coverings and hilum arrangement, ureteric course and common narrowing sites, and renal transplantation relationships. Three further expansion questions were added:
- `APP-226`: the superior and inferior pancreaticoduodenal arterial arcade linking coeliac and superior mesenteric territories.
- `APP-227`: renal segmental arteries as functional end arteries and the consequence of occlusion.
- `APP-228`: the left renal vein's relationship to the aorta and superior mesenteric artery (nutcracker anatomy).

**Verification:** the abdominal/pelvic bank was re-fetched from `main` after both writes. It now contains 225 questions with 225 unique IDs; the latest appended IDs are `APP-226`–`APP-228`. These new questions remain `verified:false` pending academic review. Chapters 14 and 18–25 have not yet been reviewed in this sequence. No claim of full-source reconciliation is made.


### Follow-on review — Suprarenal glands through Ovaries and Uterine Tubes (chapters 18–22)

Printed pages 103–128 were reviewed against the abdominal/pelvic bank. Existing coverage was found for suprarenal gland position and venous drainage, prostate zones and relations, seminal vesicle/ductus deferens anatomy, bladder anatomy and trigone landmarks, uterine supports and uterine artery–ureter relationship, ovarian supports and vessels, ovarian lymphatic drainage, and uterine tube segments and ectopic pregnancy. This was a concept-level review of the source chapter content rather than a question-by-question match for every printed MCQ.

Two additional expansion questions were added:
- `APP-229`: the oblique intramural course of the ureter as the anti-reflux mechanism at the ureterovesical junction.
- `APP-230`: the ejaculatory duct openings in relation to the seminal colliculus (verumontanum) in the prostatic urethra.

**Verification:** the abdominal/pelvic bank was re-fetched from `main` after the write. It now contains 227 questions with 227 unique IDs; the latest IDs are `APP-229` and `APP-230`. New records remain `verified:false` pending academic review. The accessible PDFDrive source's chapters 14 and 23–25 remain to be reviewed; the separate 336-page scanned Anatomy PDF remains unavailable in the current file context.

### Follow-on review — Gallbladder, Arteries/Veins/Nerves, Peritoneum, Pelvic Cavity and Perineum (chapters 14 and 23–25)

Printed pages 81–85 and 129–145 were reviewed against the live abdominal/pelvic bank. Existing coverage was identified for the cystic artery and cystohepatic triangle, gallbladder and biliary relations, portal vein formation and portosystemic connections, major abdominal and pelvic vessels, pelvic autonomic and somatic nerves, peritoneal reflections and spaces, the omental foramen, pelvic floor, anal canal, perineal pouches, pudendal neurovascular structures, and perineal body. The review was concept-level; the printed multiple-response items have not all been paired individually with a bank question.

Five further questions were added as gap-filling/depth expansion:
- `APP-231`: spiral folds (valves) of Heister in the cystic duct.
- `APP-232`: ascending lumbar–azygos/hemiazygos collateral venous pathway in caval obstruction.
- `APP-233`: communication of the right paracolic gutter with the hepatorenal recess.
- `APP-234`: phrenicocolic ligament as a partial barrier to superior spread from the left paracolic gutter.
- `APP-235`: usual branches of the posterior division of the internal iliac artery.

**Verification:** the updated `data/questions/gr-abdomen-pelvis-and-perineum.json` was fetched again from `main`, parsed successfully, and checked for duplicate IDs. It contains **232 questions and 232 unique IDs**, with no duplicate IDs; the latest additions are `APP-231`–`APP-235`. The update commit is `a7a5e3c11ce55a3ed7a83716988983713630f6e3`. The five new records remain `verified:false` pending academic review.

**Progress clarification:** the earlier count of 227 reflected the bank before these five additions. Chapters 1–25 of this accessible 145-page PDFDrive source have now received a concept-level review across the logged passes, but this does **not** mean all printed MCQs have been reconciled one by one. A true item-level pass, checking each source item against existing bank coverage and recording matched/partial/missing status, remains outstanding. The separate 336-page scanned `Anatomy MCQ.pdf` is still a different source and remains pending access.



## 8. Dual-bank reconciliation — Anatomy MCQ (PDFDrive), Chapter 1

The first item-level working pass has begun with Chapter 1, **Thoracic Wall** (printed pages 11–16; 25 numbered multiple-response questions). The printed answer key was captured separately from the question pages so that each source item can be checked against its keyed statements rather than inferred from topic headings.

The live bank was checked before adding material:
- Normal MCQ bank: `data/questions/gr-thorax.json`, 95 questions at the start of this pass. Existing coverage includes the thoracic apertures, intrinsic thoracic wall muscles, innervation, serratus anterior/winged scapula, trapezius and pectoralis minor.
- True/False bank: `data/questions/tf-core-expansion.json`, 493 stems at the start of this pass, including 7 in `gr-thorax` and existing separate stems for pleura, breast and mediastinum.

One additional True/False stem was added as `tf-gr-thorax-005` under `gr-thorax`. It consolidates independently testable facts about the intrinsic thoracic wall muscles, pectoralis minor attachments, serratus anterior innervation and pectoralis major innervation. It is marked `verified:false`, with NCBI Bookshelf anatomy references and a source note identifying Chapter 1 questions 3 and 9–20 as the source coverage. The addition was re-fetched from `main`; the T/F file now contains 494 questions with 494 unique IDs.

No normal MCQ was added in this first chapter pass because the live `gr-thorax` file already contains directly relevant normal-format coverage for the principal tested muscle and clinical concepts. This is not a claim that all 25 source items are fully matched: the detailed item-to-ID register and remaining chapter-by-chapter reconciliation are still in progress. The 584-item total previously stated is retained as a provisional inventory figure until a reproducible per-chapter item count is recorded in the register.


## 9. Dual-bank batch — Chapters 1–2 (Thoracic Wall; Abdomino-Pelvic Wall and Diaphragm)

The first expanded batch reviewed the printed questionnaires and answer keys for:
- Chapter 1, Thoracic Wall: 25 numbered multiple-response questions (printed pages 11–16).
- Chapter 2, Abdomino-Pelvic Wall and Diaphragm: 26 numbered multiple-response questions (printed pages 17–22).

The live normal-format and True/False banks were checked before editing. The batch produced the following additions:

**Normal-format bank**
- `APP-236` in `data/questions/gr-abdomen-pelvis-and-perineum.json`: course of the iliohypogastric and ilioinguinal nerves across the anterior surface of quadratus lumborum.

**True/False bank**
- `tf-gr-thorax-005`: intrinsic thoracic wall muscle groups, pectoralis minor attachments, serratus anterior innervation and pectoralis major innervation.
- `tf-gr-diaphragm-001`: diaphragmatic apertures, vertebral levels, aortic hiatus, innervation and arterial supply.
- `tf-gr-abdominal-wall-001`: inguinal canal walls, ilioinguinal nerve course, female inguinal canal contents and rectus sheath formation.

All four additions are marked `verified:false` pending academic review. Existing IDs and records were preserved. The normal bank was re-fetched and parsed after the write: **233 questions, 233 unique IDs**, latest ID `APP-236`. The T/F bank was re-fetched and parsed after the write: **496 questions, 496 unique IDs**. New T/F IDs were confirmed present.

**Coverage qualification:** these two chapters have now been reviewed against both live formats and yielded the additions above. This batch does not yet constitute a complete item-to-record register for all 51 printed questions; exact per-item matched/partial/gap statuses remain to be recorded. Do not interpret the chapter questionnaire counts as a count of newly created DxDrill questions. Chapters 3–25 remain for subsequent batches.


## 10. Dual-bank batch — Chapters 3–8 (Breast through Oesophagus)

The next source batch covered six consecutive chapters and their printed answer keys:

| Chapter | Subject | Printed question count |
|---|---|---:|
| 3 | Breast | 9 |
| 4 | Mediastinum | 24 |
| 5 | Lungs and Pleura | 17 |
| 6 | Trachea and Bronchi | 16 |
| 7 | Heart and Pericardium | 25 |
| 8 | Oesophagus and Vagus Nerve | 25 |
| **Total** | | **116** |

Both live thoracic banks were checked for existing coverage before additions. Breast and mediastinal topics already have dedicated MCQ/T-F coverage, so this batch prioritised uncovered relationships and clinically useful distinctions rather than repeating those records.

**Normal MCQ additions — `data/questions/gr-thorax.json`**
- `GRTH-96`: formation of the anterior and posterior vagal trunks from the left and right vagus nerves.
- `GRTH-97`: intrasegmental bronchus/pulmonary artery and intersegmental pulmonary vein arrangement in bronchopulmonary segments.

**True/False additions — `data/questions/tf-core-expansion.json`**
- `tf-gr-thorax-006`: pulmonary hilum relations and bronchopulmonary segmental anatomy.
- `tf-gr-thorax-007`: tracheal wall, main bronchial differences, carina and recurrent laryngeal nerve courses.
- `tf-gr-thorax-008`: coronary arterial branches, coronary sinus, pericardial attachment and ventricular wall thickness.
- `tf-gr-thorax-009`: oesophageal hiatus, oesophageal origin/covering and vagal trunk arrangement.

All six new records are marked unverified/draft pending academic review. Existing records and IDs were preserved. Post-write live re-fetch and JSON parsing confirmed **97 normal thoracic MCQs with 97 unique IDs** and **500 T/F records with 500 unique IDs**. All six new IDs were present.

**Coverage qualification:** the 116 printed questions were reviewed as a chapter batch against both banks, with the additions above selected after checking for overlap. This is not yet a complete item-by-item match register; exact source-question-to-bank-ID mapping and residual gaps still need to be recorded. No claim is made that all 116 source questions are represented as individual DxDrill records.
