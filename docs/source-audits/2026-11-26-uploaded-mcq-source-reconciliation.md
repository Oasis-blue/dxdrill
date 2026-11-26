# Uploaded MCQ source reconciliation — 26 November 2026

## Scope and handling

The recent Library upload batch contains 20 PDF files representing 16 distinct byte-level sources. Three pairs are exact duplicates (SHA-256 checked); they are treated as one source each. PDFs were materialised and text-extracted with page counts recorded. The 11-page Elhariry physiology scan was OCR-processed; its visible GIT section substantially overlaps the separately uploaded GIT MCQ file.

This reconciliation adds original, syllabus-aligned questions informed by concepts in the supplied sources. It does not reproduce textbook question wording or answer explanations. Several uploads are complete commercial question books (including a 5,000-MCQ biochemistry collection and a 6th-edition physiology MCQ/EMQ textbook); these were not bulk-copied into DxDrill. The app's question schema has no source-attribution field, so this document records provenance for this batch.

## Source inventory

| Source (canonical filename) | Pages | Reconciliation |
|---|---:|---|
| mcq_physio GIT 1.pdf | 10 | Text extracted. GIT hormones, enteric plexuses and gastric emptying reviewed; overlaps Elhariry scan. |
| #mcq_physio git 1,2,3 elhariry.pdf | 11 | OCR extracted. Repeated GIT items overlap the GIT PDF; no duplicate copy imported. |
| 808973599-100-MCQs-of-Excitable-Tissues.pdf | 13 | Text extracted; action-potential and refractory-period concepts reviewed; 2 original questions added. |
| 14_test_bank_cardiovascular_physiology_mcq_test_bank_with_answers.pdf | 45 | Text extracted; cardiovascular concepts reviewed; 2 original cardiac-cycle questions added to the closest existing topic bank. |
| MCQ- Motor function of CNS (1).pdf | 20 | Text extracted; cerebellar and basal-ganglia concepts reviewed; 2 original questions added. |
| Upper Limb MCQs.pdf | 48 | Exact duplicate of Upper Limb MCQs(1).pdf; treated as one source. 2 original questions added to upper-limb bank. |
| 3rd_Lower_Limb_mcqs.pdf | 55 | Text extracted; lower-limb and gluteal-region concepts reviewed; 2 original questions added. |
| Head and neck MCqs and answers (1)(1).pdf | 22 | Text extracted; orbit and carotid-sheath concepts reviewed; 2 original questions added. |
| MCQs in Anatomy Thorax, Abdomen, Pelvis and Perineum(1).pdf | 138 | Text extracted; thoracic anatomy concepts reviewed; 2 original questions added to thorax bank. Abdomen/pelvis-specific additions are not claimed. |
| Klm Anatomy Mcqs (1).pdf | 157 | Exact duplicate of Klm Anatomy Mcqs (1)(1).pdf; treated as one source. Text extracted. |
| Physiology MCQs Book (1).pdf | 433 | Exact duplicate of Physiology MCQs Book (1)(1).pdf; treated as one source. Text extracted. No verbatim textbook questions imported. |
| Anatomy MCQ.pdf | 336 | Text extracted; broad anatomy source. Full question-by-question reconciliation remains outstanding. |
| Anatomy MCQ ( PDFDrive ).pdf | 145 | Text extracted; broad anatomy source. Full question-by-question reconciliation remains outstanding. |
| mcqs and emqs in physiology - Copy.pdf | 361 | Text extracted; commercial 6th-edition MCQ/EMQ textbook. Full question-by-question reconciliation remains outstanding; no verbatim textbook items imported. |
| MCQs in Biochemistry - by G. Vidya Sagar-Ussama Maqbool--1.pdf | 301 | Exact duplicate of epdf.tips_mcqs-in-biochemistry-2008.pdf; treated as one source. Text extracted; broad 5,000-MCQ collection, not bulk-transcribed. |
| epdf.tips_mcqs-in-biochemistry-2008.pdf | 301 | Exact duplicate of G. Vidya Sagar PDF by SHA-256; treated as same source. |
| 5000 MCQs-in-Biochemistry.pdf | 301 | Distinct file; text extracted. Broad question collection; full question-by-question reconciliation remains outstanding. |

## Exact duplicate pairs

- `Klm Anatomy Mcqs (1).pdf` and `Klm Anatomy Mcqs (1)(1).pdf`
- `Physiology MCQs Book (1).pdf` and `Physiology MCQs Book (1)(1).pdf`
- `Upper Limb MCQs.pdf` and `Upper Limb MCQs(1).pdf`
- `MCQs in Biochemistry - by G. Vidya Sagar-Ussama Maqbool--1.pdf` and `epdf.tips_mcqs-in-biochemistry-2008.pdf`

## DxDrill changes in this reconciliation

18 original MCQs were added across nine existing topic banks. All new items are marked `verified: false` (the current schema default) and include explanations and open-answer variants.

| Topic bank | Added | New total |
|---|---:|---:|
| pl-excitable-tissues-and-action-potentials | 2 | 115 |
| pl-control-of-posture-and-movement | 2 | 60 |
| pc-cardiac-muscle-and-the-cardiac-cycle | 2 | 40 |
| pi-motor-functions-of-the-gi-tract | 2 | 20 |
| gr-upper-limb | 2 | 204 |
| gr-lower-limb | 2 | 121 |
| gr-thorax | 2 | 79 |
| gr-head-face-and-neck | 2 | 67 |
| bc-metabolism-of-biomolecules | 2 | 168 |

The additions use existing topic files, so no manifest changes were required.

## Important limitations / remaining work

- This is not a claim that every question on every page of all 17 distinct sources has been imported. Full line-by-line reconciliation of the large commercial textbooks and broad Anatomy MCQ books remains outstanding.
- Some scanned pages have OCR uncertainty. The Elhariry GIT scan was used to identify overlap, not to transcribe uncertain wording into the app.
- The commercial books' question text and explanations were not copied wholesale. New questions are independently worded and clinically/contextually adapted.
- New items remain unverified pending lecturer/senior-student review. Do not set `verified: true` automatically.
- The 18 new questions have been committed to `main`; the follow-up validation below checks the edited topic files, but it does not substitute for a full app/browser test or academic review.

