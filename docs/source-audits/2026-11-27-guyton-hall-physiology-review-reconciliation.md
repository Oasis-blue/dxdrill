# Guyton & Hall Physiology Review (Second Edition) — DxDrill reconciliation

- Source: *Guyton & Hall Physiology Review*, 2nd edition, John E. Hall, 2011.
- Library source: `Physiology MCQs Book (1)(1).pdf`
- Length: 433 PDF pages.
- Extraction: text extraction completed; 15 units and approximately 1,106 numbered question-stem starts detected. Some case-based questions share stems or use grouped question ranges, so this count is a structural count rather than a verified count of independent questions.
- Scope: physiology banks only. Existing curriculum and topic IDs are retained.

## Unit-to-curriculum routing

| Source unit | Source subject | Existing DxDrill topic routing |
|---|---|---|
| I | Cell and general physiology | `pg-cell-physiology-and-membrane-transport`, `pg-homeostasis` |
| II | Membrane physiology, nerve and muscle | `pg-cell-physiology-and-membrane-transport`, `pl-excitable-tissues-and-action-potentials`, `pl-synapses-and-neurotransmitters`, `phys-muscle` |
| III | The heart | `pc-cardiac-muscle-and-the-cardiac-cycle`, `pc-ecg`, `pc-cardiac-output` |
| IV | The circulation | `pc-arterial-pressure-and-peripheral-resistance`, `pc-special-circulations`, `pc-control-of-cardiovascular-function` |
| V | Body fluids and kidneys | `pb-fluid-compartments`, `pn-fluid-and-electrolyte-balance`, `phys-renal-structure`, `phys-urine-formation`, `phys-urine-concentration`, `phys-renal-acidbase`, `phys-renal-tests-failure`, `phys-micturition`, `phys-dialysis-diuretics`, `phys-renal-endocrine` |
| VI | Blood cells, immunity and coagulation | `pb-red-blood-cells`, `pb-white-blood-cells-and-immunity`, `pb-platelets-and-haemostasis`, `pb-blood-groups` |
| VII | Respiration | `pr-mechanics-of-breathing`, `pr-transport-of-respiratory-gases`, `pr-pulmonary-function-tests`, `pr-control-of-respiration` |
| VIII | Aviation, space and deep-sea diving | `pr-hypoxia-and-special-environments` |
| IX | General principles and sensory physiology | `pl-excitable-tissues-and-action-potentials`, `pl-synapses-and-neurotransmitters`, `pl-receptors-and-reflexes` |
| X | Special senses | `pl-special-senses` |
| XI | Motor and integrative neurophysiology | `pl-spinal-cord-brain-stem-cerebellum-and-basal-gang`, `pl-control-of-posture-and-movement`, `pl-cerebrum-eeg-sleep-and-higher-functions` |
| XII | Gastrointestinal physiology | `pi-motor-functions-of-the-gi-tract`, `pi-digestion-and-absorption`, `pi-accessory-organs` |
| XIII | Metabolism and temperature regulation | `pi-diets-bmr-and-malnutrition`, `phys-temperature`, plus relevant existing metabolic/endocrine topics |
| XIV | Endocrinology and reproduction | `pe-hypothalamus-and-pituitary`, `pe-adrenal-glands`, `pe-pancreas`, `pe-gonadal-hormones`, `pe-other-hormones`, `pp-puberty`, `pp-male-reproductive-system`, `pp-female-reproductive-system-and-ovarian-cycle`, `pp-pregnancy-and-parturition`, `pp-contraception` |
| XV | Sports physiology | Existing muscle, cardiovascular, respiratory and metabolic topics as appropriate; no new curriculum topic created. |

## First remediation batch committed

Fifteen original, source-informed MCQs were added to underpopulated existing topics:

- `pb-platelets-and-haemostasis`: 3 additions (bank total 5)
- `pb-blood-groups`: 3 additions (bank total 5)
- `pe-hypothalamus-and-pituitary`: 3 additions (bank total 5)
- `pe-adrenal-glands`: 3 additions (bank total 5)
- `pe-pancreas`: 3 additions (bank total 7)

All 15 additions are marked `verified:false` and require academic review. The additions use existing topic IDs and sequential IDs; no curriculum topic was created or renamed.

## Validation performed

- Re-fetched all five modified files from `main`.
- JSON parsing succeeded for all five files.
- IDs are unique within each modified file.
- The 15 new questions are unverified, as intended.
- No source question text or answer-key passage was copied verbatim.

## Second remediation batch committed

A further 27 original, source-informed MCQs were added across nine existing topics:

- `pi-digestion-and-absorption`: +3 (total 13)
- `pi-accessory-organs`: +3 (total 12)
- `pi-diets-bmr-and-malnutrition`: +3 (total 5)
- `pe-gonadal-hormones`: +3 (total 5)
- `pe-other-hormones`: +3 (total 5)
- `pp-male-reproductive-system`: +3 (total 5)
- `pp-female-reproductive-system-and-ovarian-cycle`: +3 (total 5)
- `pp-pregnancy-and-parturition`: +3 (total 5)
- `pp-contraception`: +3 (total 5)

Nine original true/false sets (three statements each) were also added to the existing `tf-core-expansion.json` bank for those same physiology topics. The T/F bank now contains 539 sets, up from 530. All 27 MCQs and all nine T/F sets are marked unverified/draft-unverified for academic review.

## Second-batch validation

- Re-fetched all ten modified files from `main`.
- JSON parsing succeeded for every file.
- IDs are unique within each file.
- MCQ answer indices and option arrays passed structural checks.
- No curriculum topic was created, renamed, or remapped.

## Remaining work — not yet complete

This is a progress checkpoint, not a claim that all 1,106 stem starts have been reconciled. The full item-by-item audit against both MCQ and true/false banks remains to be completed across all 15 units. Further additions should follow only after matching individual source items to existing coverage and identifying genuine gaps. The printed source answer key has not been independently validated.

## T/F format correction — 27 November 2026

A follow-up check against `tf-checker.html`, `docs/tf-master-prompt.md` and the README identified that the nine newly added T/F stems initially had only three statements each. This did not meet DxDrill's required format of four or five statements per stem. The nine stems were corrected by adding one independently judged, explained statement to each. Their references were replaced with direct HTTPS source URLs. All nine remain `verified:false` / `draft-unverified`.

The corrected T/F bank was re-fetched from `main` and parsed successfully. Each of the nine corrected stems now has exactly four statements, mixed True/False keys, statement-specific explanations, and HTTPS references. The T/F bank remains at 539 stems. This is a structural validation; medical accuracy and source-to-claim support still require academic review, and the full 15-unit source reconciliation remains incomplete.
