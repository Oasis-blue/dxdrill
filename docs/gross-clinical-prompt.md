# Prompt for specimen, diagram and clinical-sign pictures

For gross anatomy specimens and models, diagrams (anatomy or physiology), X-rays and clinical signs. It is like the histology prompt, with a few extras for marked structures, credits and consent.

Before you start:
- Only use pictures you took yourself, drew yourself, or that have a free licence (for example Wikimedia Commons, where the licence is stated). Do not copy from textbooks or search results.
- No identifiable patients and no faces. Do not upload a patient photo without written consent. For dissection-hall pictures, check your department allows photos and keep anything identifying out of the frame.
- Mark structures by drawing a letter or arrow on the picture (any phone photo editor or PowerPoint works). One picture can be marked A and B. Keep the markers large enough to read on a phone.

How to use it:
1. Open the AI that has your pictures. Paste everything between the two lines as your message, then attach 5 to 10 pictures.
2. Fill in TOPIC ID, HOW MANY and NOTES at the bottom (what each picture is, where you got it, and which letters are marked).
3. Check every answer yourself before using it. Labelled structures and clinical signs are where AI is most often confidently wrong.
4. Photo files go in the site folder `data/img/gross/` (specimens and models), `data/img/diagrams/` or `data/img/clinical/`. Name them as the prompt says. Compress each to about 1200 px wide.

--------------------------------------------------------------------

You are helping make picture-based practice questions for Nigerian MBBS students. I will give you pictures and my own notes. Output one JSON object that a website loads directly.

HONESTY RULES
- Describe only what is clearly visible or stated in my NOTES. If you cannot tell what a structure is, or which letter marks which structure, do not guess: set "unsure": true and say what I should check in "check".
- Use only standard medical knowledge that agrees with my notes. Do not invent facts, measurements or eponyms.
- Do not mention patient names or any identifying detail. Do not draw or add labels. Refer only to the letters that are already on the picture.

OUTPUT FORMAT
Reply with one JSON code block and nothing before or after it:

{
  "topic": "TOPIC ID FROM ME",
  "slides": [
    {
      "file": "gross/<topic>-01.jpg",
      "alt": "One plain sentence describing the picture for someone who cannot see it, naming the marked letters.",
      "kind": "specimen | model | diagram | xray | clinical-sign",
      "shows": "What the picture is, in a few words",
      "marks": "Which letter marks which structure, e.g. A = left lobe of liver, B = gallbladder. Empty if nothing is marked.",
      "credit": "Photo: own  (or the source and licence, e.g. Wikimedia Commons, CC BY-SA 4.0, author name)",
      "unsure": false,
      "check": "Anything I should verify, or empty",
      "questions": [
        {
          "id": "<topic>-p01a",
          "level": 1,
          "sub": "Section heading",
          "q": "What is the structure marked A?",
          "options": ["Correct answer", "Wrong answer", "Wrong answer", "Wrong answer"],
          "answer": 0,
          "explain": "Why it is right, naming the clue that identifies it, in one to three sentences.",
          "image": "gross/<topic>-01.jpg",
          "alt": "Same text as the slide alt",
          "credit": "Same as the slide credit",
          "verified": false
        }
      ]
    }
  ]
}

RULES FOR QUESTIONS
- 2 to 3 questions per picture. Use a mix, depending on the kind:
  * specimen or model: identify the marked structure (A, then B); name a relation or a nerve or vessel that runs with it; a function or a clinical point about it.
  * diagram or graph: read a value or a feature, or what changes if one thing changes.
  * x-ray: name the view or finding, or the structure marked.
  * clinical sign: name the sign, the nerve or structure involved, and what condition it suggests.
- Each question stands on its own and does not say "see above". If a picture has two marked structures, ask about A and B in separate questions.
- The correct option is always first in "options" and "answer" is always 0. The website shuffles them.
- Wrong options must be believable look-alikes. Never use "all of the above" or "both A and B".
- Every question carries the same "image", "alt" and "credit" as its slide.
- ids are unique, lowercase, letters, numbers and hyphens only.
- Use Unicode for symbols (Na⁺, H₂O, →, ≥). No LaTeX or HTML tags.

TOPIC ID: 
HOW MANY PICTURES IN THIS BATCH: 
NOTES (what each picture is, source and licence if not mine, which letters are marked and on what): 
--------------------------------------------------------------------

What to do with the result: tell me the topic ids and send the JSON and pictures, as you did for histology. I will move slides marked "unsure" to a review list, like before.
