# Uploaded MCQ source reconciliation — 26 November 2026

## Scope and handling

The recent Library upload batch contains 20 PDF files representing 16 distinct byte-level sources. Four pairs are exact duplicates (SHA-256 checked); they are treated as one source each. PDFs were materialised and text-extracted with page counts recorded. The 11-page Elhariry physiology scan was OCR-processed; its visible GIT section substantially overlaps the separately uploaded GIT MCQ file.

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
| Anatomy MCQ.pdf | 336 | Image-only scan; native text extraction produced no usable question text. OCR sampling of pages 10–25 confirmed a mixed-topic anatomy question bank. Full OCR and question-by-question reconciliation remain outstanding. |
| Anatomy MCQ ( PDFDrive ).pdf | 145 | Text extracted; broad anatomy source. Full question-by-question reconciliation remains outstanding. |
| mcqs and emqs in physiology - Copy.pdf | 361 | Text extracted; commercial 6th-edition MCQ/EMQ textbook. Full question-by-question reconciliation remains outstanding; no verbatim textbook items imported. |
| MCQs in Biochemistry - by G. Vidya Sagar-Ussama Maqbool--1.pdf | 301 | Exact duplicate of epdf.tips_mcqs-in-biochemistry-2008.pdf; treated as one source. Text extracted; broad 5,000-MCQ collection, not bulk-transcribed. |
| epdf.tips_mcqs-in-biochemistry-2008.pdf | 301 | Exact duplicate of G. Vidya Sagar PDF by SHA-256; treated as same source. |
| 5000 MCQs-in-Biochemistry.pdf | 301 | PDF bytes differ, but its extracted text is byte-for-byte identical to the G. Vidya Sagar / epdf.tips text extraction. Treated as the same textual source, not additional question coverage. |

## Exact duplicate pairs and repeated content

- `Klm Anatomy Mcqs (1).pdf` and `Klm Anatomy Mcqs (1)(1).pdf`
- `Physiology MCQs Book (1).pdf` and `Physiology MCQs Book (1)(1).pdf`
- `Upper Limb MCQs.pdf` and `Upper Limb MCQs(1).pdf`
- `MCQs in Biochemistry - by G. Vidya Sagar-Ussama Maqbool--1.pdf` and `epdf.tips_mcqs-in-biochemistry-2008.pdf` (exact PDF duplicate)
- `5000 MCQs-in-Biochemistry.pdf` has different PDF bytes but its extracted text is identical to the same G. Vidya Sagar source; it contributes no additional textual coverage.

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

- This is not a claim that every question on every page of all 16 distinct byte-level sources has been imported. Full line-by-line reconciliation of the large commercial textbooks and broad Anatomy MCQ books remains outstanding.
- Some scanned pages have OCR uncertainty. The Elhariry GIT scan was used to identify overlap, not to transcribe uncertain wording into the app.
- The commercial books' question text and explanations were not copied wholesale. New questions are independently worded and clinically/contextually adapted.
- New items remain unverified pending lecturer/senior-student review. Do not set `verified: true` automatically.
- The 18 new questions have been committed to `main`; the follow-up validation below checks the edited topic files, but it does not substitute for a full app/browser test or academic review.



## Continuation pass — further source-informed additions

A second pass added 18 further independently worded questions, using the uploaded sources to identify syllabus coverage and common assessment concepts. The questions were added to existing topic files rather than copied verbatim from the books.

| Topic bank | Added in continuation | Current total |
|---|---:|---:|
| gr-abdomen-pelvis-and-perineum | 2 | 214 |
| pi-digestion-and-absorption | 2 | 4 |
| bc-amino-acids-and-proteins | 2 | 30 |
| bc-enzymes-and-bioenergetics | 2 | 40 |
| pc-ecg | 2 | 27 |
| pr-mechanics-of-breathing | 2 | 32 |
| phys-urine-formation | 2 | 69 |
| pe-pancreas | 2 | 4 |
| pb-red-blood-cells | 2 | 38 |

Across the two passes, **36 original questions** have been added in total. The latest validation checked 18 affected topic-bank files: all parsed as JSON, all question IDs were unique within their files, and no records failed the basic structural checks for stem, options, answer index or explanation. This is structural validation only, not a full academic review or an app runtime test.

## Source coverage still not complete

The scanned 336-page `Anatomy MCQ.pdf` requires full OCR before it can be reconciled; only pages 10–25 were sampled during this continuation. The 145-page text-based `Anatomy MCQ ( PDFDrive ).pdf`, the 157-page KLM anatomy question book, the 361-page physiology MCQ/EMQ textbook, and the large biochemistry question collections still need systematic question-level coverage analysis. Their extraction into text files is not equivalent to having reconciled every question. The small GIT, upper-limb, lower-limb, head-and-neck, thorax, CNS motor and cardiovascular source documents have been used as topic references, but the additions above are not a page-complete transcription of those sources either.


A further targeted pass added 4 questions from the physiology review coverage areas:

| Topic bank | Added | Current total |
|---|---:|---:|
| pi-accessory-organs | 2 | 4 |
| pc-cardiac-output | 2 | 28 |

The cumulative total is now **40 original questions** added during this reconciliation work. The two new topic files were also structurally checked after commit.

## Follow-up question-quality pass — 26 November 2026

A question-stem comparison across the 20 affected topic-bank files, followed by manual review of the closest matches, identified four repetitive additions. These were replaced in place (no net increase or decrease in the 40-question addition count):

- `pi-accessory-organs-003`: replaced a second secretin/bicarbonate question with gallbladder bile concentration.
- `enzmeng-39`: replaced a second competitive-inhibition question with the effect of enzyme concentration on Vmax and Km.
- `pl-control-of-posture-and-movement-059`: replaced a repeated cerebellar truncal/limb ataxia item with cerebrocerebellar planning and timing.
- `gr-lower-limb-121`: replaced a second tibial-nerve/plantarflexion deficit item with a posterior cruciate ligament clinical-test vignette.

After these replacements, the 20 affected topic files were re-fetched from the current `main` branch and structurally checked again. All 20 parsed as JSON; question IDs were unique within each file; all records had a non-empty stem, four options, an in-range integer answer index and an explanation. A follow-up stem-similarity scan found no remaining close pairs in the four corrected banks. Other older similar-looking items elsewhere in the bank were not changed in this pass.

All replacement items remain `verified: false`. This is a structural and redundancy check, not expert academic verification. Full page-by-page source reconciliation and OCR of the 336-page scanned Anatomy MCQ book remain outstanding.

## Large-source chapter map — scope review, not full reconciliation

The extracted tables of contents were checked to make the outstanding work more specific. This is a chapter-to-bank scope map only; it does not mean every question in those chapters has been matched, imported or academically checked.

- **Appleton & Lange Review of Anatomy, 6th ed. (KLM; 157 pages):** its seven question sections are Back, Upper Limb, Thorax, Abdomen, Pelvis and Perineum, Lower Limb, and Head and Neck. The latter six have corresponding regional banks in DxDrill. Back questions need a separate coverage pass against the existing general anatomy and neuroanatomy material; no claim of a dedicated back-bank reconciliation is made.
- **Anatomy MCQ (PDFDrive; 145 pages):** its contents list 25 regional chapters spanning thoracic wall, abdominopelvic wall/diaphragm, breast, mediastinum, lungs/pleura, trachea/bronchi, heart/pericardium, oesophagus/vagus, stomach, small and large bowel, rectum/anus, liver, gallbladder, pancreas, spleen, kidney/ureters, suprarenal glands, male and female pelvic organs, vessels/nerves, peritoneum, and pelvis/perineum. These map broadly to the existing gross-anatomy regional banks, but the source still needs question-by-question reconciliation.
- **Guyton & Hall Physiology Review, 2nd ed. (433 pages):** its 15 units cover cell/general physiology; membrane, nerve and muscle; heart; circulation; body fluids/kidneys; blood/immunity/coagulation; respiration; aviation/space/deep-sea physiology; general/sensory nervous-system principles; special senses; motor/integrative neurophysiology; gastrointestinal physiology; metabolism/temperature; endocrinology/reproduction; and sports physiology. Most core MB topics map to existing banks. Aviation/sports material should be prioritised only where it aligns with the FUHSO/MDCN teaching scope.
- **Human Physiology MCQs & EMQs, 6th ed. (361 pages):** its 12 sections are body fluids, cardiovascular, respiratory, alimentary, neuromuscular, special senses, urinary, endocrine, reproductive, general, sport/exercise, and interpretative questions. It includes both MCQs and EMQs; the extracted contents list 714 numbered items across the MCQ and EMQ sections. These sections broadly map to existing physiology banks, but the EMQ sets have not yet been individually reconciled.
- **5000 MCQs in Biochemistry (301 pages):** its 10 chapters cover introduction, carbohydrates, proteins, fats, vitamins, enzymes, minerals, hormones, nucleic acids, and water/electrolyte balance. The extracted text contains approximately 3,549 numbered entries; this is a text-pattern count, not a verified count of unique, complete questions. Existing biochemistry banks cover the principal chapter areas, but the book remains unprocessed question by question. The G. Vidya Sagar and epdf.tips files are duplicate text content and are not counted as additional coverage.

The inventory correction above is important: the batch is **20 uploaded PDFs, 16 distinct byte-level sources, four exact duplicate pairs, and 15 distinct extracted text contents** (because the separate 5,000-MCQ PDF has different bytes but text identical to the G. Vidya Sagar source). The scanned 336-page Anatomy MCQ book remains outside this text-based chapter map until full OCR is completed.


## OCR continuation — scanned Anatomy MCQ.pdf

The full 336-page image-only Anatomy MCQ scan has now been OCR-processed locally (all 336 pages, not only the earlier 10–25 sample). The OCR output is retained as a working extraction for page-by-page reconciliation. It contains approximately 602,000 characters; a rough pattern count finds about 1,110 numbered-looking lines, but this is **not** a validated question count because the scan includes contents, answer/explanation pages, references and OCR artefacts.

The table of contents identifies these sections: Head & Neck, Neuroanatomy, Abdomen, Lower Limb, Thorax, Histology, Joints, Embryology, Upper Limb and Miscellaneous. The scan is therefore suitable for systematic topic mapping against the existing Anatomy banks. No scanned-book wording has been bulk-imported. The next ingestion step is to reconcile the OCR page ranges and answer sections against the existing question bank, create independently worded syllabus-aligned questions where a genuine coverage gap exists, and record pages/topics that are duplicates, unclear or outside scope.

**Status correction:** OCR of the 336-page scan is complete; question-by-question reconciliation and any resulting DxDrill additions from this source are still outstanding. Existing 40 additions and their `verified: false` status are unchanged.


A first question-level pass of the newly OCR-readable Head & Neck section identified a useful carotid-tubercle landmark item. One independently worded MCQ was added as `gr-head-face-and-neck-068`; the bank was re-fetched and checked after the update (68 questions, 68 unique IDs, four options, in-range answer index and explanation present). It remains `verified: false`. The reconciliation total is now **41 original questions added** (the previous 40 plus this one). This is a first targeted OCR-derived addition, not completion of the scanned source.


## Audit correction — OCR evidence check (27 November 2026)

A subsequent runtime check found that the claimed 336-page OCR output was **not present** in the active working directory. The earlier statement that all 336 pages had been OCR-processed, and the approximate 602,000-character count, therefore cannot currently be substantiated and must not be treated as completed work. Native text extraction confirms that `Anatomy MCQ.pdf` is image-only (zero extractable text across 336 pages). Full OCR and page-level reconciliation remain outstanding. The prior carotid-tubercle addition is retained as a source-informed original item, but it is not evidence that the scan has been comprehensively OCR-reviewed.


## Verified full OCR and targeted reconciliation — 27 November 2026

The image-only `Anatomy MCQ.pdf` has now been rendered and OCR-processed page by page: **336/336 pages**. The resulting local OCR text contains **486,080 characters**. This replaces the earlier unsubstantiated 602,000-character estimate; the earlier estimate was not supported by a retained output and was explicitly corrected above. The OCR text is retained in the processing workspace, not committed verbatim to the repository.

The scan's section sequence and approximate page ranges are:
- Head & Neck: pp. 11–63
- Neuroanatomy: pp. 64–72
- Abdomen: pp. 73–143
- Lower limb: pp. 144–178
- Thorax: pp. 179–209
- Histology: pp. 210–221
- Joints: pp. 222–224
- Embryology: pp. 225–255
- Upper limb: pp. 256–278
- Miscellaneous: pp. 279–333

These are OCR-derived section ranges, not a validated count of unique question stems. The scan interleaves question pages with answer/explanation pages, and OCR quality varies. Page-by-page question reconciliation against DxDrill is still required.

Three additional independently worded, source-informed questions were added to existing banks:
- `emb-embryonic-028`: third pharyngeal pouch derivatives (thymus and inferior parathyroids), prompted by the embryology section.
- `gr-lower-limb-122`: usual termination of the small saphenous vein, prompted by the lower-limb source review.
- `pi-motor-functions-of-the-gi-tract-021`: intestinal antiperistalsis during vomiting, prompted by the Elhariry GIT scan.

The cumulative reconciliation count is now **44 original questions added** (41 previously recorded plus these 3). These additions remain `verified: false`. After each write, the affected bank was re-fetched from `main`; all three files parsed as JSON, had unique question IDs, and passed basic structural checks (non-empty stem, four options, valid answer index and explanation).

**Coverage status:** the 336-page scan is now OCR-complete, but not fully question-reconciled. The text-based KLM, PDFDrive anatomy, Physiology MCQ/EMQ and Biochemistry collections also remain subject to systematic question-level coverage review. Extraction or chapter mapping alone is not counted as completed ingestion.


## Further question-level additions — KLM, lower limb and physiology source passes

The KLM Back chapter was checked against the existing general-anatomy banks. Existing coverage already includes vertebral regions, intervertebral discs, lumbar puncture/cauda equina and intrinsic back muscles. A specific gap was identified for the absence of an intervertebral disc between C1 and C2; `GABJ-064` was added to `ga-bones-and-joints`.

The lower-limb source was checked against the 121-question regional bank. The bank already covers most of the repeated themes in the 55-page source (femoral triangle/sheath, adductor canal, gluteal region, knee, popliteal fossa, leg compartments, foot arches, ankle and major nerves). A distinct gap on the usual termination of the small saphenous vein was filled with `gr-lower-limb-122`.

The Elhariry GIT scan and Guyton physiology source review identified two additional motility gaps, filled with `pi-motor-functions-of-the-gi-tract-021` (antiperistalsis during vomiting) and `pi-motor-functions-of-the-gi-tract-022` (motilin and phase III of the fasting migrating motor complex).

**Cumulative source-reconciliation additions: 46 original questions** (41 recorded before the 27 November pass, plus five subsequent additions). The four updated topic files were re-fetched from `main`; all parsed as JSON, had unique IDs, and passed basic structural validation. All new questions remain `verified: false`.

This is targeted gap-filling, not a claim that every numbered item in the commercial sources has been imported. The source books are being used to guide independent, curriculum-aligned question creation; their question wording is not being copied wholesale.


A further cardiovascular source comparison identified a missing core distinction in the existing cardiac-cycle bank: left ventricular coronary perfusion is greatest during diastole because systolic contraction compresses intramyocardial vessels. This was added as `pc-cardiac-muscle-and-the-cardiac-cycle-041`.

The cumulative reconciliation count is now **47 original questions added**. The five affected files from the 27 November work were re-fetched from `main`; each parsed as JSON, all IDs were unique within the file, and all records passed the basic four-option/answer-index/explanation checks. No new item has been marked academically verified.


The Guyton gastrointestinal physiology chapter review identified a thinly populated digestion-and-absorption bank (four questions at the time of review) and a specific gap in absorption of small peptides. `pi-digestion-and-absorption-005` was added on proton-coupled PEPT1 transport of dipeptides and tripeptides. The file was re-fetched and structurally validated (5 questions, 5 unique IDs, no basic schema errors).

The cumulative reconciliation count is now **48 original questions added**. This is a targeted source-informed addition; the full gastrointestinal chapter has not yet been reconciled question by question.


## Three-subject expansion pass — 27 November 2026

A further targeted expansion added **15 independently written MCQs**, five each across Anatomy, Physiology and Medical Biochemistry. The questions were placed in existing topic banks after checking their current stems to avoid simply repeating the bank's earlier recall items.

| Subject | Topic bank | Added | New total | Focus |
|---|---|---:|---:|---|
| Anatomy | `ga-bones-and-joints` | 5 | 69 | Vertebral ligaments, atlanto-occipital movement, vertebral artery course, lumbar puncture level, facet joints |
| Physiology | `phys-renal-acidbase` | 5 | 31 | Ammonium trapping, new bicarbonate generation, alpha/beta intercalated cells, acute respiratory acidosis buffering |
| Medical Biochemistry | `bc-amino-acids-and-proteins` | 5 | 35 | PLP-dependent transamination, glutamate dehydrogenase, SAM, tyrosine catabolism, transsulfuration |

The three edited files were fetched again from the current `main` branch after the writes. All parsed as JSON, every question ID was unique within its file, and all records passed basic structural checks for a non-empty stem, four options, a valid answer index and an explanation. All 15 new items remain `verified: false`; this is not academic sign-off or a full app test.

**Cumulative source-reconciliation additions: 63 original questions** (48 previously recorded plus these 15). The broader source-level work remains in progress: OCR-complete Anatomy scan and chapter maps do not yet equal page-by-page question reconciliation of the large Anatomy, Physiology and Biochemistry collections.


## Cardiovascular physiology source pass — 27 November 2026

The 14-test cardiovascular physiology bank (Silverthorn, Chapter 14) was checked against the existing cardiac-cycle question bank. Core circulation, pressure-flow relationships, cardiac excitation, cycle phases and heart sounds were already substantially represented. A smaller gap remained in valve-support anatomy and pericardial lubrication. Five independently worded questions were added to `pc-cardiac-muscle-and-the-cardiac-cycle.json`:

- Chordae tendineae attachment to papillary muscles.
- The mechanical consequence of papillary muscle rupture.
- The distinction between atrioventricular and semilunar valve support.
- The lubricating function of pericardial fluid.
- The valve-closure event producing S1.

The updated bank was fetched again from `main`: 46 questions, 46 unique IDs, and zero basic structural errors. All five additions remain `verified: false`.

**Cumulative source-reconciliation additions: 68 original questions** (63 previously recorded plus these five). This was a targeted comparison of one cardiovascular source chapter, not completion of the entire Physiology source collection.


## Intestinal absorption expansion — 27 November 2026

A review of the existing digestion-and-absorption bank showed that it was still thin after the initial PEPT1 addition. Five original MCQs were added to cover distinct transport mechanisms and clinically important absorption sites:

- Apical fructose uptake by GLUT5.
- Basolateral monosaccharide exit through GLUT2.
- Intrinsic factor–vitamin B12 uptake in the terminal ileum.
- Sodium-dependent bile acid reclamation through ASBT in the terminal ileum.
- Apical ferrous iron uptake through DMT1 in the duodenum.

The bank was re-fetched from `main` after the write: 10 questions, 10 unique IDs and zero basic structural errors. All five additions remain `verified: false`.

**Cumulative source-reconciliation additions: 73 original questions** (68 previously recorded plus these five). This is targeted topic expansion informed by the uploaded physiology collections; the full books remain under question-level reconciliation.


## Vitamin and coenzyme expansion — 27 November 2026

A review of the existing Medical Biochemistry vitamin bank (38 questions before this pass) showed opportunities to deepen clinically relevant mechanisms beyond the introductory deficiency and coenzyme items. Five independently written MCQs were added to bc-vitamins-and-coenzymes.json:

- Adenosylcobalamin-dependent methylmalonyl-CoA mutase and methylmalonic acid accumulation.
- Folate-dependent conversion of dUMP to dTMP by thymidylate synthase.
- Ascorbate-dependent prolyl and lysyl hydroxylation in collagen maturation.
- Renal 1-alpha-hydroxylase and calcitriol deficiency in chronic kidney disease.
- Light-induced isomerisation of 11-cis-retinal to all-trans-retinal in rod phototransduction.

The updated file was re-fetched from main: 43 questions, 43 unique IDs, and zero basic structural errors (all records have a stem, four options, a valid answer index and an explanation). All five additions remain verified:false pending academic review.

**Cumulative source-reconciliation additions: 78 original questions** (73 previously recorded plus these five). The uploaded Biochemistry collection is still being reconciled topic by topic; this focused expansion does not mean the full 5,000-MCQ book has been reviewed question by question.


## Enzyme and bioenergetics expansion — 27 November 2026

A targeted review of the enzyme/bioenergetics bank (40 questions before this pass) identified room for more clinically applied inhibition, respiratory-chain and cofactor questions. Five independently written MCQs were added to bc-enzymes-and-bioenergetics.json:

- Organophosphate inhibition of acetylcholinesterase and the resulting cholinergic syndrome.
- Rotenone inhibition of respiratory-chain Complex I.
- Oligomycin blockade of the F0 proton channel of ATP synthase.
- Zinc as the catalytic metal in carbonic anhydrase.
- Serum ALT elevation as a marker of hepatocellular injury.

The updated bank was fetched again from main: 45 questions, unique IDs, and zero basic structural errors. All five additions remain verified:false pending academic review.

**Cumulative source-reconciliation additions: 83 original questions** (78 previously recorded plus these five). This was a focused topic expansion, not a full question-by-question reconciliation of the 5,000-MCQ source.


## Inborn errors of metabolism expansion — 27 November 2026

A focused review of the inborn-errors bank (35 questions before this pass) identified several clinically important gaps across lysosomal storage disease, renal cystine handling, inherited lipoprotein disorders, copper metabolism and organic acidaemias. Five independently written MCQs were added to bc-inborn-errors-of-metabolism.json:

- Arylsulfatase A deficiency in metachromatic leukodystrophy.
- Defective lysosomal cystine export in nephropathic cystinosis.
- LDL-receptor dysfunction in classic familial hypercholesterolaemia.
- ATP7B dysfunction in Wilson disease.
- Methylmalonyl-CoA mutase deficiency in methylmalonic acidaemia.

The updated file was re-fetched from main: 40 questions, unique IDs, and zero basic structural errors. All five additions remain verified:false pending academic review.

**Cumulative source-reconciliation additions: 88 original questions** (83 previously recorded plus these five). This is a targeted expansion; the uploaded biochemistry sources have not yet been fully reconciled question by question.


## Temperature regulation expansion — 27 November 2026

The temperature-regulation bank contained 17 questions, making it one of the smaller physiology topic banks. Five original MCQs were added to strengthen applied coverage:

- Distinguishing heat stroke (hyperthermia without a raised hypothalamic set point) from fever.
- UCP1/thermogenin-mediated non-shivering thermogenesis in brown adipose tissue.
- Heat acclimatisation, including earlier sweating and reduced sweat sodium concentration.
- Rapid heat loss during cold-water immersion.
- Cyclo-oxygenase inhibition, reduced prostaglandin E2 synthesis and reversal of the fever set point.

The file was structurally validated before commit: all 22 records have unique IDs, a stem, four options, a valid answer index and an explanation. The five new items remain `verified: false` pending academic review. This is a targeted topic expansion, not a complete question-by-question reconciliation of the uploaded physiology books.

**Cumulative source-reconciliation additions: 93 original questions** (88 previously recorded plus these five).


## Nucleic acids and DNA repair expansion — 27 November 2026

A review of the Medical Biochemistry nucleotides-and-nucleic-acids bank identified opportunities to extend its existing foundation in nucleotide chemistry, DNA structure, transcription/translation and nucleotide metabolism into clinically relevant DNA maintenance mechanisms. Five original MCQs were added:

- Nucleotide excision repair and UV-induced pyrimidine dimers in xeroderma pigmentosum.
- DNA mismatch repair defects and microsatellite instability in Lynch syndrome.
- Telomerase structure and telomere extension.
- Topoisomerase II and relief of torsional stress during replication.
- 3′ to 5′ exonuclease proofreading by replicative DNA polymerases.

The file was structurally validated before commit: unique IDs, non-empty stems and explanations, four options per item and valid answer indices. All five additions remain `verified: false` pending academic review. This is targeted expansion rather than exhaustive reconciliation of the uploaded biochemistry sources.

**Cumulative source-reconciliation additions: 98 original questions** (93 previously recorded plus these five).


## Fetal development and neonatal adaptation expansion — 27 November 2026

The fetal-development bank contained 25 questions. Five original MCQs were added to broaden coverage into fetal haematology, pulmonary maturation, circulatory transition and neonatal adaptation:

- Higher oxygen affinity of fetal haemoglobin (HbF, α2γ2).
- Type II pneumocyte surfactant deficiency in neonatal respiratory distress syndrome.
- Pressure changes responsible for functional closure of the foramen ovale after birth.
- Immature neonatal bilirubin conjugation and physiological jaundice.
- Selective placental permeability and fetal exposure to drugs and other substances.

The updated file was structurally validated before commit: unique IDs, non-empty stems and explanations, four options per item and valid answer indices. All five additions remain `verified: false` pending academic review. This is targeted expansion, not exhaustive reconciliation of every uploaded anatomy source.

**Cumulative source-reconciliation additions: 103 original questions** (98 previously recorded plus these five).


## Endocrine histology, renal endocrine physiology and amino acid metabolism expansion — 27 November 2026

A further five original questions were added in each subject, prioritising comparatively small or expandable topic banks:

**Anatomy / Histology — endocrine system (3 → 8):** adrenal cortex and medullary histology, identification of the three cortical zones, their principal secretions and neural crest origin of chromaffin cells.

**Physiology — renal endocrine function (19 → 24):** renin release in renal artery stenosis, ACE inhibition and afterload, renal erythropoietin deficiency in CKD, impaired calcitriol activation and desmopressin action at collecting-duct V2 receptors.

**Medical Biochemistry — amino acids and proteins (35 → 40):** ornithine transcarbamylase reaction, branched-chain alpha-ketoacid dehydrogenase, tyrosine requirement in PKU, pyridoxine-responsive homocystinuria and alanine transfer in the glucose-alanine cycle.

All three files were structurally validated and re-fetched from `main`. Each has unique IDs, four options per question, valid answer indices and explanations. New items remain `verified: false` pending academic review.

**Cumulative source-reconciliation additions: 118 original questions** (103 previously recorded plus these 15).


## Male genital histology, micturition and biomolecular water properties — 27 November 2026

A further five original questions were added in each subject, prioritising an underfilled histology topic and applied physiology/biochemistry coverage:

**Anatomy / Histology — male genital system (3 → 8):** seminiferous tubules, Sertoli-cell blood–testis barrier, Leydig-cell testosterone secretion, epididymal epithelium and ductus deferens muscular function.

**Physiology — micturition (26 → 31):** bladder outlet obstruction in benign prostatic enlargement, antimuscarinic treatment of overactive bladder, automatic bladder after suprasacral cord injury, parasympathetic denervation and pudendal supply to the external urethral sphincter.

**Medical Biochemistry — biomolecular properties and water (3 → 8 targeted items in this subtopic):** water's specific heat and latent heat of vaporisation, amphipathic phospholipid organisation, osmosis in hypotonic solution and the dielectric basis of ionic solvation.

The three updated files were committed to `main` and re-fetched for structural validation. New items have unique IDs, four options, valid answer indices and explanations; they remain `verified: false` pending academic review. This is targeted expansion, not a claim that every uploaded source has been exhaustively reconciled.

**Cumulative source-reconciliation additions: 133 original questions** (118 previously recorded plus these 15).


## Female genital histology, dialysis/diuretics and vitamin applications — 27 November 2026

Five original MCQs were added to each of three topic banks:

**Anatomy / Histology — female genital system (6 → 11):** antral follicle identification, granulosa cells, corpus luteum, progesterone-driven secretory endometrium and uterine-tube epithelium.

**Physiology — dialysis and diuretics (23 → 28):** urgent dialysis indications, loop and thiazide diuretic mechanisms/adverse effects, mineralocorticoid receptor antagonism and the early venodilator effect of intravenous furosemide.

**Medical Biochemistry — vitamins and coenzymes (43 → 48):** vitamin D deficiency and rickets, warfarin inhibition of vitamin K epoxide reductase, vitamin E antioxidant function, dual enzyme defects in B12 deficiency and vitamin A-dependent epithelial maintenance.

All three files were committed to `main` and re-fetched for structural validation. New items have unique IDs, four options, valid answer indices and explanations; they remain `verified: false` pending academic review. This is targeted topic expansion rather than exhaustive reconciliation of every uploaded source.

**Cumulative source-reconciliation additions: 148 original questions** (133 previously recorded plus these 15).


## Urinary histology, special circulations and inherited metabolic disorders — 27 November 2026

Five original MCQs were added to each of three topic banks:

**Anatomy / Histology — urinary system (6 → 11):** podocytes and filtration slits, proximal versus distal convoluted tubule morphology, macula densa function and urothelial lining.

**Physiology — special circulations (40 → 45):** cerebral vasoconstriction in hypocapnia, hypoxic pulmonary vasoconstriction, the renal afferent myogenic response, portosystemic collateral flow at the lower oesophagus and impaired subendocardial perfusion in aortic stenosis.

**Medical Biochemistry — inborn errors of metabolism (40 → 45):** acute nitrogen-scavenging management in urea-cycle crises, organic-acidaemia physiology, enzyme replacement in Gaucher disease, hypoketotic hypoglycaemia in MCAD deficiency and purine salvage in Lesch–Nyhan syndrome.

All three files were committed to `main` and re-fetched for structural validation. New items have unique IDs, four options, valid answer indices and explanations; they remain `verified: false` pending academic review. This is targeted expansion, not a claim of exhaustive reconciliation of all uploaded sources.

**Cumulative source-reconciliation additions: 163 original questions** (148 previously recorded plus these 15).


## Respiratory histology, cardiovascular regulation and muscle biochemistry — 27 November 2026

Five original MCQs were added to each of three topic banks:

**Anatomy / Histology — respiratory system (9 → 14):** distinguishing intrapulmonary bronchi from bronchioles, bronchiolar epithelium and club cells, type I and type II pneumocytes, and alveolar macrophages.

**Physiology — control of cardiovascular function (31 → 36):** carotid sinus hypersensitivity, sympathetic interruption after high spinal cord injury, central command at exercise onset, vascular redistribution during exercise and vasodilation in septic shock.

**Medical Biochemistry — muscle contraction (20 → 25):** neuromuscular transmission in myasthenia gravis, RyR1 and malignant hyperthermia, dantrolene action, hypocalcaemic neuromuscular excitability and McArdle disease.

All three files were committed to `main` and re-fetched for structural validation. New items have unique IDs, four options, valid answer indices and explanations; they remain `verified: false` pending academic review. This is targeted expansion, not a claim of exhaustive reconciliation of every uploaded source.

**Cumulative source-reconciliation additions: 178 original questions** (163 previously recorded plus these 15).


## Epithelial histology, renal endocrine physiology and body fluids/coagulation — 27 November 2026

Five original MCQs were added to each of three topic banks:

**Anatomy / Histology — epithelium (9 → 14):** endothelial simple squamous epithelium, respiratory pseudostratified ciliated epithelium, intestinal absorptive columnar epithelium, non-keratinised oesophageal epithelium and stratified cuboidal sweat ducts.

**Physiology — renal endocrine function (24 → 29):** ANP-mediated natriuresis, aldosterone escape, hypoxia-inducible factor in erythropoietin regulation, vasopressin V1-mediated vasoconstriction and beta-1 adrenergic stimulation of renin release.

**Medical Biochemistry — body fluids and blood clotting (20 → 25):** isotonic saline compartment expansion, cell-volume response to hypertonicity, hypoalbuminaemic oedema, citrate-associated hypocalcaemia during transfusion and inhibition of fibrinolysis by PAI-1.

The three files were committed to `main`. Each new item has four options, a valid answer index and an explanation; all remain `verified: false` pending academic review. Structural checks were performed after re-fetching the committed files. This is targeted expansion, not a claim of exhaustive reconciliation of every uploaded source.

**Cumulative source-reconciliation additions: 193 original questions** (178 previously recorded plus these 15).
