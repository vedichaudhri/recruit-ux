# Careers Page as a Recruiting Agent — Prototype

The usual careers-page UX: browse a list of hundreds of jobs, guess which one fits,
summarize yourself onto a one-page resume, apply into a third-party ATS, hear nothing
back.

This prototype flips it. A candidate pastes their accomplishments in plain text — no
resume formatting, no one-page limit — and a recruiting agent (Claude) reads it, works
out a quick profile (strengths / growth areas), and matches it against the company's
real open roles with an explained fit score, instead of making the candidate browse and
guess.

It's a **static, no-backend prototype**, built to be demoable from GitHub Pages:

- `jobs.json` — **real** job postings scraped once from
  [Target's public careers site](https://corporate.target.com/careers) (snapshot date
  noted inside the file). Spans Store Hourly/Leadership, Supply Chain Hourly, Assets
  Protection, Target Tech, Legal, Marketing, and an internship — chosen to span very
  different job families so the matching has something real to prove.
- `index.html` / `style.css` / `app.js` — the page itself. No build step, no framework,
  no npm install.
- Matching is a **real Claude API call**, made directly from your browser.
- Candidates can type their background, upload one or more PDFs (resume, work samples),
  or both. Text extraction happens entirely client-side via
  [pdf.js](https://mozilla.github.io/pdf.js/) loaded from a CDN — PDFs never leave the
  browser except as extracted text sent to Anthropic alongside anything typed.

### Why there's no "add your LinkedIn" field

LinkedIn profile pages are login-walled and block scraping, and there's no public API
for reading someone else's profile — so a "paste your LinkedIn URL" field would quietly
do nothing. Instead, candidates use LinkedIn's own **More → Save to PDF** on their
profile and upload that export through the same PDF path as a resume. Same pipeline,
no scraping, actually works.

## Running it locally

No build step needed. From this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Using it

1. Expand "Add your Anthropic API key" and paste in a key from
   [console.anthropic.com](https://console.anthropic.com/settings/keys). Click
   **Save in this browser** — this stores it in `localStorage`, nowhere else.
2. Paste a few sentences (or paragraphs) about what you've actually done — work history,
   projects, responsibilities, in your own words.
3. Click **Find my matches**. The agent reads your text plus all the jobs in
   `jobs.json` in one call, and returns a profile plus ranked, explained matches.

## Deploying to GitHub Pages

```bash
git init
git add index.html style.css app.js jobs.json README.md
git commit -m "Recruiting-agent careers page prototype"
```

Push to a new GitHub repo, then in the repo's **Settings → Pages**, set the source to
the `main` branch, root folder. No GitHub Actions workflow is required — these are
plain static files.

## Why it's built this way (and what a real product would need)

This is a concept demo, not a product:

- **Client-side API key.** There's no backend here to hold a shared key secretly, so
  each visitor supplies their own, stored only in their own browser and sent straight to
  Anthropic (`anthropic-dangerous-direct-browser-access` header). A real product would
  need a backend to hold one key and proxy the calls — never ship a page that asks real
  users for their own API key.
- **Frozen job data.** `jobs.json` is a one-time scrape, not a live feed. A real
  integration would sync against the company's actual ATS/job board on a schedule.
- **Whole-list-in-context matching.** With ~20 jobs, stuffing the full list into one
  prompt is simple and works well. At the scale this concept is really aimed at
  (hundreds or thousands of roles, many companies), that approach breaks down — a real
  system would need retrieval/embeddings to narrow candidates before ranking, rather
  than one big prompt.
