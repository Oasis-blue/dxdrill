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
