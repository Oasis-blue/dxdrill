# Prompt: true/false stems for DxDrill (exam style)

Paste everything below the line into your question-writing AI, then add the topic, the topic id and your source notes or textbook pages.

---

You are writing **true/false stems** for a medical school study app. This is the same format as the school's exams: a short stem, then four or five statements. A student marks each statement True or False independently. Wrong answers lose a mark, so every statement must be defensible from a standard textbook.

## What I will give you
- The topic and its **topic id** (use it exactly).
- My notes, slide text or textbook pages. Use only facts that are in them or are standard textbook knowledge. If you are not sure a statement is correct, leave it out.

## Rules for the stem
- One short line that names the subject, for example "About the radial nerve:" or "Concerning the loop of Henle:".
- Do not put facts, hints or answers in the stem.

## Rules for the statements (most important)
1. **Four or five statements per stem.** Never fewer than four.
2. **Each statement stands alone.** Do not write "both 1 and 2", "all of the above", "none of the above" or refer to other statements. They will be shown in random order.
3. **Each statement is clearly true or clearly false.** Avoid "may", "sometimes", "usually", "can" unless the textbook states it that way. Avoid opinion and unsettled points.
4. **Mix true and false in every stem.** Aim for 2 or 3 true and 2 or 3 false. Never all true, never all false.
5. **Make the false ones plausible.** A false statement should be a common mistake: a neighbouring structure, a swapped side, a wrong root value, a reversed direction, a near-miss number. Never a silly or obviously absurd statement.
6. **Make the true and false statements look alike.** Similar length, similar wording and detail. Do not make true statements longer or more detailed than false ones. Do not use absolute words (always, never, only, all) mainly in false statements.
7. **One idea per statement.** Do not join two facts with "and" where one might be false.
8. **Cover different aspects across a stem** (for example course, supply, relations, root value, clinical effect), not five versions of the same fact.
9. **Do not repeat the same fact** in other stems of the same batch.
10. Keep statements under about 20 words.

## Rules for the explanations
- Every statement gets a one-sentence explanation: why it is true, or what the correct fact is when it is false. Do not repeat the statement. Do not just say "this is incorrect".
- The explanation is shown after the student answers. It must not appear anywhere in the statement.

## Output format
Return one JSON object, nothing else, no commentary:

```json
{
  "questions": [
    {
      "id": "tf-<topic id>-001",
      "type": "tf",
      "topic": "<topic id>",
      "level": 2,
      "sub": "<short sub-heading, e.g. Nerves of the upper limb>",
      "q": "About the radial nerve:",
      "items": [
        { "text": "Runs in the radial groove on the back of the humerus", "answer": true,  "explain": "It lies in the groove with the profunda brachii vessels." },
        { "text": "Winds around the surgical neck of the humerus",        "answer": false, "explain": "That is the axillary nerve. The radial nerve winds around the shaft." },
        { "text": "...", "answer": true,  "explain": "..." },
        { "text": "...", "answer": false, "explain": "..." }
      ],
      "verified": false
    }
  ]
}
```

- `id`: `tf-` plus the topic id plus a three-digit number, unique, never reused.
- `answer` is the JSON value `true` or `false`, not a word in quotes.
- `level`: 1 easy, 2 medium, 3 hard.
- Write 10 stems unless I ask for more. Each stem 4 or 5 statements.
- Put the statements in any order. The app shuffles them.

## Before you answer, check each stem
- Are there 4 or 5 statements, with a mix of true and false?
- Is every statement correct according to a standard text?
- Are the false ones believable mistakes, and not clearly different in length or tone from the true ones?
- Is every statement independent of the others?
- Does every statement have a useful explanation?

If a topic does not have enough solid, non-overlapping facts for 10 stems, write fewer and say so at the end. Quality matters more than quantity.