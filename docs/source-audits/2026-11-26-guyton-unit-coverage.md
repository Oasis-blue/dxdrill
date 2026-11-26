# Guyton & Hall Physiology Review — unit coverage map (26 November 2026)

## Source structure

The supplied *Guyton & Hall Physiology Review* is a 433-page review book organised into 15 units. Its table of contents identifies the following units. This map uses the unit headings as source-derived scope; the DxDrill bank mapping is our own curriculum mapping.

## Unit-to-bank coverage

| Source unit | DxDrill topic banks mapped |
|---|---|
| 1. The cell and general physiology | pg-cell-physiology-and-membrane-transport; pg-homeostasis |
| 2. Membrane physiology, nerve and muscle | pl-excitable-tissues-and-action-potentials; pl-synapses-and-neurotransmitters; phys-muscle; pg-cell-physiology-and-membrane-transport |
| 3. The heart | pc-cardiac-muscle-and-the-cardiac-cycle; pc-ecg; pc-cardiac-output |
| 4. The circulation | pc-arterial-pressure-and-peripheral-resistance; pc-special-circulations; pc-control-of-cardiovascular-function |
| 5. Body fluids and kidneys | pb-fluid-compartments; pn-fluid-and-electrolyte-balance; phys-renal-structure; phys-urine-formation; phys-urine-concentration; phys-renal-acidbase; phys-renal-tests-failure; phys-micturition; phys-dialysis-diuretics; phys-renal-endocrine |
| 6. Blood cells, immunity and blood coagulation | pb-red-blood-cells; pb-white-blood-cells-and-immunity; pb-platelets-and-haemostasis; pb-blood-groups |
| 7. Respiration | pr-mechanics-of-breathing; pr-transport-of-respiratory-gases; pr-pulmonary-function-tests; pr-control-of-respiration |
| 8. Aviation, space and deep-sea diving physiology | pr-hypoxia-and-special-environments |
| 9. Nervous system: general principles and sensory physiology | pl-receptors-and-reflexes; pl-spinal-cord-brain-stem-cerebellum-and-basal-gang; pl-cerebrum-eeg-sleep-and-higher-functions |
| 10. Nervous system: special senses | pl-special-senses |
| 11. Nervous system: motor and integrative neurophysiology | pl-control-of-posture-and-movement; pl-spinal-cord-brain-stem-cerebellum-and-basal-gang; pl-cerebrum-eeg-sleep-and-higher-functions; phys-muscle |
| 12. Gastrointestinal physiology | pi-motor-functions-of-the-gi-tract; pi-digestion-and-absorption; pi-accessory-organs |
| 13. Metabolism and temperature regulation | pi-diets-bmr-and-malnutrition; phys-temperature; phys-skin |
| 14. Endocrinology and reproduction | pe-hypothalamus-and-pituitary; pe-adrenal-glands; pe-pancreas; pe-gonadal-hormones; pe-other-hormones; pp-puberty; pp-male-reproductive-system; pp-female-reproductive-system-and-ovarian-cycle; pp-pregnancy-and-parturition; pp-contraception |
| 15. Sports physiology | phys-muscle; pc-cardiac-output; pr-transport-of-respiratory-gases; phys-temperature |

## Coverage additions made in this pass

New topic banks were created for GI physiology, BMR/nutrition physiology, endocrine physiology, reproductive physiology, platelet/haemostasis physiology and blood groups. Each new MCQ has a keyed answer and an explanation. The new bank files were added to `data/manifest.json` so the application can load them.

## Structural validation

- The manifest contains 130 question-bank entries after the blood/haemostasis additions.
- The repository check confirms every manifest entry has a matching `data/questions/<topic>.json` file and every question JSON file is registered.
- The new banks were parsed and checked for duplicate IDs, missing MCQ explanations and invalid MCQ answer indices.
- A repository-wide pass across the 128 manifest entries present before the final blood/haemostasis addition found no missing MCQ explanations, invalid answer indices or duplicate IDs within the individual bank files. The two new blood/haemostasis banks were checked separately after creation.

## Targeted answer-explanation audit

A limited check of the supplied cardiac physiology answer explanations identified these problems:

| Location | Issue found | Correct treatment |
|---|---|---|
| Heart unit, explanation 4 | The explanation gives stroke volume as 100 mL and end-systolic volume as 150 mL, but then reports an ejection fraction of 66.7%. | End-diastolic volume is 100 + 150 = 250 mL, so ejection fraction is 100/250 = 40%. The printed calculation is internally inconsistent and the stated percentage should not be accepted. |
| Heart unit, explanation 8 | **Recheck: the earlier audit incorrectly flagged this explanation.** | Retain the source explanation on this point. Cardiac T-tubules are extensive and contain negatively charged mucopolysaccharides that bind calcium; the source's point about a substantial tubular calcium reservoir and dependence on extracellular calcium is consistent with the Guyton account. This item is not classified as an error. |

This is a targeted audit of two identifiable answer explanations, not a complete validation of the review book's more than 1,000 questions. The source is used for topic coverage, not question reproduction.

## Limits

This is a coverage map, not a claim that all 15 source units have been exhaustively transcribed or that every source answer has been independently peer-reviewed. The copyrighted review book is used for unit/topic coverage only. All added questions are independently authored. Content-level review and lecturer validation remain separate quality gates.
