# True/False bank quality audit — initial pass

Date: 2026-11-26  
Scope: the original nine-stem `tf-sample` file and the first two expansion batches.

## Editorial review of the original nine stems

The nine original stems cover radial nerve, ulnar nerve, scaphoid, right lung, juxtaglomerular apparatus, loop of Henle, GFR/clearance, thermoregulation and skeletal muscle histology.

- No obvious answer-key reversal was found in this first editorial pass.
- Explanations were rewritten to give the anatomical or physiological mechanism and, where useful, a clinical implication or important qualification.
- The creatinine statement is now explicitly qualified: creatinine is filtered and not meaningfully reabsorbed, but a small amount is secreted, so creatinine clearance slightly overestimates GFR.
- The GFR value is described as an approximate teaching value, not a universal fixed normal.
- All nine retain `verified: false`. Editorial review is not the same as independent source verification.

## First expansion batch

Added 36 draft stems in the expansion file (16 in the first batch plus 20 in the second batch), across the covered topics:
- Anatomical position and terminology
- Upper limb
- Cell physiology and membrane transport
- Muscle physiology
- Fluid compartments
- Enzymes and bioenergetics
- Carbohydrate metabolism
- Amino acids and proteins

Every new stem is explicitly marked `verified: false` and `reviewStatus: "draft-unverified"`. These are a structured expansion draft, not yet cleared as medically verified student content. They must be checked against the course's preferred textbooks and/or authoritative references before being promoted to verified status.

## Quality rules to apply to every future stem

1. Each stem should contain 4–5 independently judgeable statements.
2. Each statement must have one defensible True/False key under the stated context.
3. Avoid absolutes unless the absolute is genuinely correct.
4. Include necessary qualifiers for age, physiological state, anatomical variation, measurement method and clinical context.
5. Distractors should test a meaningful misconception, not a trick in wording.
6. Explanations should teach the mechanism and correct the misconception.
7. Keep source attribution and verification status separate from editorial review.
8. Do not set `verified: true` until the answer key and explanations have been checked against a named authoritative source.

## Structural validation

The combined bank currently contains 45 stems across 17 curriculum topics. Automated checks on the branch found 45 unique IDs, valid topic references, 4–5 statements per stem, mixed True/False keys in every stem, non-empty explanations, and both files registered in the manifest. No structural issues were reported.

## Remaining work

- Independently verify each statement in the original and expansion files.
- Expand coverage across the remaining Anatomy, Physiology and Medical Biochemistry curriculum topics.
- Add automated schema, duplicate-ID, mixed-key, explanation-length and topic-reference checks to the bank validation workflow.
