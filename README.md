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

- `jobs.json` — **real** job postings scraped once from four different real sources, to
  show the concept across very different "careers page" shapes:
  - [Target](https://corporate.target.com/careers) — big-box retail/supply chain (21 roles)
  - [Walmart](https://careers.walmart.com) — big-box retail/supply chain (22 roles)
  - [OpenAI](https://openai.com/careers) — frontier AI lab, research/eng/policy/ops (20 roles)
  - [YC's "Work at a Startup" board](https://www.workatastartup.com/jobs) — a genuinely
    different shape: one *board*, many different startups each posting their own roles
    (15 roles across 10 startups, gathered logged-out, no account created)

  A company switcher lets you pick which real job set to match against; each has its
  own accent color and source note (with snapshot date) shown in the UI.
- `index.html` / `style.css` / `app.js` — the page itself. No build step, no framework,
  no npm install.
- Matching is a **real Claude API call**, made directly from your browser, scoped to
  whichever company/board is currently selected.
- Candidates can type their background, upload one or more PDFs (resume, work samples),
  or both. Text extraction happens entirely client-side via
  [pdf.js](https://mozilla.github.io/pdf.js/) loaded from a CDN — PDFs never leave the
  browser except as extracted text sent to Anthropic alongside anything typed.

### Adding another company

`jobs.json` is just `{ "companies": [ {id, name, tagline, accentColor, snapshotDate,
sourceNote, jobs: [...] }, ... ] }` — the switcher, badge, and prompt framing are all
driven from this data, so adding a company is a data change, not a code change. The only
exception is a YC-style multi-poster board: give each job a `companyName` field (which
startup/employer actually posted it) and the UI and prompt will surface it automatically.

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
2. Pick a company/board to match against (Target, Walmart, OpenAI, or the YC board).
3. Paste a few sentences (or paragraphs) about what you've actually done — work history,
   projects, responsibilities, in your own words.
4. Click **Find my matches**. The agent reads your text plus every open role for the
   selected company in one call, and returns a profile plus ranked, explained matches.

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
- **Frozen job data.** `jobs.json` is a one-time scrape per company, not a live feed. A
  real integration would sync against each company's actual ATS/job board on a schedule.
- **Whole-list-in-context matching.** With 15-22 jobs per company, stuffing the full list
  into one prompt is simple and works well. At the scale this concept is really aimed at
  (hundreds or thousands of roles per company, as Target and Walmart's real sites
  actually have), that approach breaks down — a real system would need
  retrieval/embeddings to narrow candidates before ranking, rather than one big prompt.
