# DxDrill

Practice questions and live quiz rounds for medical students. Topics follow the MDCN curriculum guidelines (Chapter 6 and Table 6:3) and cover every subject: the preclinical subjects (anatomy, physiology, biochemistry, behavioural sciences), pharmacology, pathology and the clinical subjects. Only some topics have questions so far.

It is a plain website: HTML, CSS, JavaScript and JSON files. There is nothing to install and no build step.

## Put it online for free (GitHub Pages)

1. On GitHub, create a new repository (for example `dxdrill`). Make it Public.
2. Open the repository, choose **Add file → Upload files**, and drag in everything from this folder (the `index.html` file, and the `css`, `js` and `data` folders). Click **Commit changes**.
3. Go to **Settings → Pages**. Under "Build and deployment", set Source to **Deploy from a branch**, choose branch **main** and folder **/ (root)**, then Save.
4. After a minute or two the site appears at `https://YOUR-USERNAME.github.io/dxdrill/`. That address is what you link to from Freebuff.

Netlify alternative: sign in at netlify.com, choose **Add new site → Deploy manually**, and drag this whole folder onto the page.

The site must be opened from a web address. Double-clicking `index.html` on your computer will not load the questions.

## Add questions

Each topic has one file in `data/questions/`, named after the topic id (for example `phys-muscle.json`). The topic ids are in `data/curriculum.json`.

```json
{
  "topic": "phys-muscle",
  "questions": [
    {
      "id": "mus-062",
      "type": "mcq",
      "level": 2,
      "sub": "Ch 32 Neuromuscular junction",
      "q": "The question text?",
      "options": ["Correct answer", "Wrong 1", "Wrong 2", "Wrong 3"],
      "answer": 0,
      "explain": "Why the answer is right.",
      "open": {
        "q": "Standalone version of the question, with no reference to options.",
        "accept": ["alternative wording 1", "alternative wording 2"]
      },
      "verified": false
    }
  ]
}
```

- `answer` is the position of the correct option in `options`, counting from 0. The site shuffles the options when it shows them.
- `level` is 1 (core), 2 (applied) or 3 (challenge).
- `sub` is an optional section name used for filtering and for the results chart.
- `open` is for hall mode rounds with no answer options. `q` must make sense on its own (no "which of the following"). `accept` lists other answers the quizmaster should accept, and is shown as "Also accept". Add `"a"` inside `open` if the answer should read differently without options. If a question only works with options (a "which is NOT" or ordering question), leave `open` out and add `"optionsOnly": true`. Such questions are skipped in no-options rounds and always show their options in mixed rounds.
- Every `id` must be unique across all files.
- Set `"verified": true` once a lecturer or senior student has checked the question.

For a topic that has no file yet, create `data/questions/<topic-id>.json` and add its name (without `.json`) to the `questions` list in `data/manifest.json`.

## Add describe-it and explain-it terms

Terms live in files like `data/terms-muscle.json`. Each one has a `topic`, a `term`, three `clues` (vague first, easy last, none containing the term) and a `forbidden` list of words the explainer must avoid. Add new term files to the `terms` list in `data/manifest.json`.

## Classes

The class list (U20 to U26) is in `data/curriculum.json` under `classes`. U25 has no name yet. In hall mode setup, open **Class names** to rename any class. That change is saved in the browser on that device only. Edit `curriculum.json` to change it for everyone until accounts are added.

## Hall mode answer format

Rapid fire, Question board and Everyone answers each have an **Answer format** setting: always show options, no options (open answers) or mixed.

## Accounts and leaderboards (Supabase)

1. In Supabase, open **SQL Editor → New query**, paste all of `supabase/setup.sql`, and click **Run**.
2. Open **Authentication → Sign In / Providers → Email** and turn **Confirm email** off. Supabase's built-in email sender allows only a few emails an hour, so with confirmation on, most of a class cannot sign up.
3. Open **Authentication → URL Configuration** and set the Site URL to your GitHub Pages address.
4. Upload this folder to GitHub again, then sign up on the live site.
5. Make yourself admin: edit the last line of `setup.sql` with your email (remove the two dashes at the start) and run it. As admin you can rename classes from the Account page.

The project URL and publishable key are in `js/cloud.js`. The publishable key is meant to be public. Never put the `service_role` key anywhere in this folder.

Points are different questions answered correctly in the period. Scores are sent from the browser, so a determined student could fake them. That is fine for practice leaderboards, but competitions will need server-side marking.

## What this version does not do yet

- Admin-run competitions are not built yet. Practice history and hall settings stay on the device in its browser storage.
- Hall mode runs on one screen. The quizmaster sees answers on the same screen the room sees, so show the answer only when you are ready.
- Questions are textbook-level and unverified until marked.

Next steps planned: admin-run competitions with their own leaderboards, and live phone rounds with a second-device quizmaster view.
