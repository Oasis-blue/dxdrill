# Prompt for visual practical and clinical-image question intake

Use this prompt for gross anatomy specimens and models, anatomical or physiology diagrams, radiographs, and clinical signs. It produces a **reviewable intake file**, not a file that the website can load directly.

## Before starting

- Use only pictures you took yourself, drew yourself, or that have a licence permitting the intended reuse. Record the source, author and exact licence.
- Do not copy textbook scans or arbitrary search-result images.
- Do not include identifiable patients or identifying metadata. Obtain written consent for clinical photographs of people and follow institutional rules for dissection-hall photography.
- Mark structures on the image itself for this first release (letters/arrows). Keep markers readable on a phone and do not obscure the structure.
- Put the actual image files in the repository under `data/img/` before import. Use `gross/`, `diagrams/`, `clinical/` or `xray/`. Do not invent a filename for an image that has not been supplied.
- Compress images sensibly for mobile while retaining enough detail for identification.

## How to use

1. Attach 5–10 actual image files and provide the topic ID, source/licence information, what each image shows, and the meaning of any markers.
2. Generate one intake JSON object using the schema below.
3. Check every image, label, answer, distractor and explanation.
4. Do not import until a reviewer confirms that every referenced image exists in the repository, loads successfully, has acceptable attribution, and has been anatomically/clinically checked.

---

## Prompt to give the AI

You are helping prepare image-based learning questions for medical students. I will provide actual image files and notes. Return **one JSON object only**, in a single JSON code block. This is an intake format for a human-reviewed importer; it is **not** the website's final question-file format.

### Honesty and safety rules

- Describe only what is clearly visible or stated in my notes. If you cannot confidently identify a structure, marker, view, sign or finding, set `unsure` to `true` and explain exactly what needs checking in `check`.
- Never guess a marker-to-structure mapping. Never silently convert uncertainty into a verified answer.
- Do not invent image sources, authors, licences, patient consent, measurements or eponyms.
- Do not include patient names or identifying details.
- Do not add, remove or move labels on the supplied image. Refer only to labels already visible.
- Use medically sound explanations, but flag discrepancies with source notes rather than silently overriding them.
- Every question must be answerable from the supplied image plus the stated subject knowledge. Do not make the image decorative when it is essential to the question.

### Intake JSON schema

Return this structure:

```json
{
  "schemaVersion": 1,
  "topic": "VALID CURRICULUM TOPIC ID SUPPLIED BY ME",
  "assets": [
    {
      "id": "unique-lowercase-asset-id",
      "file": "gross/example-specimen-01.jpg",
      "kind": "specimen",
      "alt": "One plain sentence describing the image and any visible markers.",
      "credit": "Photo: own",
      "sourceUrl": "",
      "licence": "Own original photograph",
      "shows": "Short description of what the image depicts",
      "marks": { "A": "Structure identified by marker A" },
      "unsure": false,
      "check": "",
      "station": {
        "id": "unique-lowercase-station-id",
        "title": "Short station title",
        "instructions": "Candidate instruction, if needed",
        "seconds": 60
      },
      "questions": [
        {
          "id": "unique-lowercase-question-id",
          "level": 1,
          "sub": "Relevant section heading",
          "q": "Identify the structure marked A.",
          "options": ["Correct answer", "Plausible distractor 1", "Plausible distractor 2", "Plausible distractor 3"],
          "answer": 0,
          "explain": "A concise teaching explanation.",
          "unsure": false,
          "check": ""
        }
      ]
    }
  ]
}
```

### Field rules

- `schemaVersion` must be the number `1`.
- `topic` must be an exact topic ID supplied by me from the site's curriculum. Do not make one up.
- `assets` contains one entry per actual attached image. Every `file` must be a relative path beneath `data/img/`, including its folder. Initial folders: `gross/`, `diagrams/`, `clinical/`, `xray/`.
- `kind` must be one of `specimen`, `model`, `diagram`, `xray` or `clinical-sign`.
- Asset, station and question IDs must be unique lowercase kebab-case identifiers.
- `credit`, `sourceUrl` and `licence` must reflect the actual source. Never infer a licence. For an original image use a clear credit such as `Photo: own`.
- `marks` maps each visible marker label to the proposed structure. Use an empty object if there are no markers. If any mapping is uncertain, set the asset's `unsure` to true and explain in `check`.
- Each asset represents one visual station in this first version. The station's ordered `questionIds` will be derived from its `questions` array during import; do not output a second copy of the question list.
- Use 2–4 focused questions per image where the image supports them. Do not pad the set with weak questions.
- Each question must have exactly four plausible options. `answer` is a zero-based index; put the correct answer first and set it to 0 for intake consistency. The website shuffles options later.
- Distractors must be plausible but unambiguously wrong. Avoid "all of the above", "none of the above", "both A and B", and overlapping options.
- Question IDs must be unique across the batch and must not collide with IDs already in the bank.
- Do not put `image`, `alt`, `credit` or `visualStationId` on each intake question. The importer copies these from the asset and creates normal question records.
- Use `unsure: true` and a non-empty `check` whenever an image, label, answer, source or explanation needs human verification. An uncertain asset or any question under it must be held out of import.
- Use Unicode symbols (Na⁺, H₂O, →, ≥). Do not use LaTeX or HTML.

### Question-writing guidance

- Specimen/model: identify marked structures; ask about relations, contents, attachments, supply, function or clinical relevance only where supported.
- Diagram/graph: identify components, interpret a trace or trend, or reason about a change shown.
- X-ray: state the view/findings, identify a marked structure, or interpret a clearly visible abnormality. Do not infer details not visible.
- Clinical sign: identify the sign, likely nerve/muscle/structure involved, and clinical implication. Do not diagnose a real person from an image.
- Keep each question self-contained. Avoid "as above" and references to another question.
- A question that depends on an image must retain that image when converted into an ordinary DxDrill question.

---

## Batch details to supply

TOPIC ID:
NUMBER OF ACTUAL IMAGES ATTACHED:
NOTES FOR EACH IMAGE (what it shows, source/author/licence, visible markers and proposed meanings):
ANY SPECIFIC LEARNING OBJECTIVES:
