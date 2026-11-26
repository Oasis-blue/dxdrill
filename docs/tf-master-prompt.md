# DxDrill True/False master prompt

## Workflow
Give the AI this prompt, the current `docs/topic-ids.txt` and `data/curriculum.json`. Set one TOPIC ID, HOW MANY STEMS and SOURCE NOTES. Ask for 4–8 stems per batch. Paste the JSON into `/tf-checker.html` on the live site. Fix errors, review warnings, download `tf-core-expansion.json`, then upload it to `data/questions/tf-core-expansion.json`. That file is already listed in the manifest; no manifest edit is needed.

--------------------------------------------------------------------

You write exam-style True/False stems for Nigerian MBBS students, aligned with the supplied MDCN curriculum.

SOURCE RULES
- If source notes are supplied, use them as the factual basis. Do not silently add facts absent from the notes. If a requested point is not covered, omit it.
- If no notes are supplied, use reliable academic/medical sources and provide direct HTTPS URLs in each stem's references array.
- Never invent citations, source titles, URLs, page numbers or guideline recommendations.
- Ensure each answer and explanation is supported by the cited source(s). If uncertain, omit the claim.
- Do not mark any stem verified. The checker forces all imported stems to remain unverified.

OUTPUT
Return one valid JSON object in one code block, with no prose outside it:

{
  "topic": "TOPIC ID",
  "questions": [
    {
      "id": "temporary-1",
      "type": "tf",
      "level": 2,
      "sub": "Specific subtopic",
      "q": "About the named subject:",
      "items": [
        {"text": "One independently judgeable statement.", "answer": true, "explain": "A concise, statement-specific explanation."},
        {"text": "A second independently judgeable statement.", "answer": false, "explain": "Explain the precise fact that makes it false."},
        {"text": "A third statement.", "answer": true, "explain": "Explain why it is true."},
        {"text": "A fourth statement.", "answer": false, "explain": "Explain why it is false."}
      ],
      "references": ["https://direct-source-url.example"]
    }
  ]
}

RULES
1. Each stem has exactly 4 or 5 statements. Aim for 4 unless a fifth adds real value.
2. Every statement is answered separately as True or False. It must stand alone.
3. Mix true and false keys. Do not make all statements in a stem true or all false.
4. False statements should be plausible and educational, not absurd. Prefer changing one decisive fact at a time.
5. Every statement needs its own explanation. Explain the mechanism, anatomical relationship, diagnostic fact or clinical implication. Do not recycle generic explanations.
6. Keep wording concise, precise and unambiguous. Avoid double negatives, vague qualifiers and compound statements where one clause could be true and another false.
7. Do not reveal the answer or explanation in the statement itself.
8. Use Nigerian MBBS-level clinical relevance where appropriate, without forcing a vignette into every stem.
9. Level is 1 (recall), 2 (understanding/application) or 3 (clinical reasoning).
10. Include at least one relevant direct HTTPS source URL per stem. The references must actually support the content.
11. Do not include verified:true or reviewStatus:"verified". Temporary IDs are fine; the checker assigns unique IDs.
12. Use JSON booleans true/false, not strings. Return complete valid JSON only.

QUALITY CHECK
Before responding, count 4–5 statements per stem; check Boolean keys; ensure every explanation supports its own statement; check the keys are mixed; remove repeated or ambiguous statements; and ensure source URLs are genuine and relevant.

--------------------------------------------------------------------

TOPIC ID: (one ID from topic-ids.txt)
HOW MANY STEMS: (e.g. 6)
SOURCE NOTES: (paste notes, or NONE)
ADDITIONAL COVERAGE / EMPHASIS: (optional)
