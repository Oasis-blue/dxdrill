# DxDrill question-quality follow-up — 26 November 2026

## Scope

Reviewed the current kidney physiology, cell physiology, anatomical terminology and upper-limb question banks on `main` after the 26 November content pass. This follow-up checks bank structure and selected answer/explanation quality. It does not claim access to live learner-performance telemetry.

## Current bank sizes

| Bank | Questions |
|---|---:|
| Cell physiology and membrane transport | 37 |
| Anatomical position and terminology | 77 |
| Upper limb gross anatomy | 202 |
| Renal structure | 59 |
| Renal endocrine | 19 |
| Renal tests and failure | 18 |
| Renal acid–base | 26 |

## Structural validation

All seven banks parsed as JSON. Across these banks, every question had a non-empty stem, at least two options, a valid zero-based answer index, a non-empty explanation, and a unique ID within its bank. No structural defects were found by this pass.

## Content correction made

- `ren-195`: The prior explanation attributed minimal-change-disease proteinuria mainly to loss of negative charge selectivity. That is an oversimplification and is not an appropriate keyed mechanism for this question. The item now tests the podocyte foot-process/slit-diaphragm interface directly. The MCQ options, answer index, explanation and open-response accepted answers were revised together.
- The revised item remains `verified: false`; the correction is an editorial content review, not independent lecturer sign-off.

## Performance-data limitation

The admin Activity panel requests `admin_missed_questions(p_days: 30, p_min: 5, p_limit: 15)`. The database function is admin-only and reports questions from the previous 30 days with at least five answers, ordered by lowest percentage correct. It excludes admin accounts. Live Supabase rows are not available through the repository connection used for this review, so this pass cannot honestly claim to have selected the actual 0–33% correctness cohort.

To complete a true performance-led audit, use the live admin Activity panel after the Supabase update-19 function is installed, or provide an export of its Most-missed questions table. A low score should trigger inspection, not automatic rewriting: valid difficult questions may remain difficult.

## Remaining review

- Inspect every item in the 0–33% live cohort for answer-key errors, ambiguity, distractor quality and explanation quality.
- Preserve sound but difficult questions; do not lower difficulty merely to improve the percentage correct.
- Continue topic-gap expansion using live usage/repeat data, especially renal physiology, cell physiology, anatomical terminology and upper limb.
- Keep all unreviewed questions marked unverified; repository-level structural validation is not equivalent to medical expert validation.
