const STORAGE_KEY = "recruiting-agent-anthropic-key";
const WORKSPACE_STORAGE_KEY = "recruiting-agent-anthropic-workspace-id";
const COMPANY_STORAGE_KEY = "recruiting-agent-selected-company";
const MODEL = "claude-sonnet-5";
const PDFJS_VERSION = "6.3.289";
const DEFAULT_ACCENT = "#cc0000";

let companies = [];
let selectedCompanyId = null;
let uploadedFiles = []; // { id, name, status: 'parsing'|'done'|'error', text, error }
let pdfjsPromise = null;

function getCurrentCompany() {
  return companies.find((c) => c.id === selectedCompanyId) || null;
}

function getCurrentJobs() {
  return getCurrentCompany()?.jobs || [];
}

const el = {
  badge: document.getElementById("job-count-badge"),
  companyTabs: document.getElementById("company-tabs"),
  companyScaleNote: document.getElementById("company-scale-note"),
  companySourceNote: document.getElementById("company-source-note"),
  keyDetails: document.getElementById("key-details"),
  keyStatus: document.getElementById("key-status"),
  keyInput: document.getElementById("api-key-input"),
  workspaceInput: document.getElementById("workspace-id-input"),
  saveKeyBtn: document.getElementById("save-key-btn"),
  clearKeyBtn: document.getElementById("clear-key-btn"),
  textarea: document.getElementById("accomplishments"),
  pdfInput: document.getElementById("pdf-input"),
  fileList: document.getElementById("file-list"),
  matchBtn: document.getElementById("match-btn"),
  errorBox: document.getElementById("error-box"),
  loading: document.getElementById("loading"),
  results: document.getElementById("results"),
  agentSummary: document.getElementById("agent-summary"),
  prosList: document.getElementById("pros-list"),
  consList: document.getElementById("cons-list"),
  matchesList: document.getElementById("matches-list"),
};

function getStoredKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function getStoredWorkspaceId() {
  try {
    return localStorage.getItem(WORKSPACE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function refreshKeyStatus() {
  const key = getStoredKey();
  const workspaceId = getStoredWorkspaceId();
  if (key) {
    el.keyStatus.textContent = "✓ API key saved in this browser — ready to match";
    el.keyStatus.classList.add("ready");
    el.keyInput.value = key;
  } else {
    el.keyStatus.textContent = "① Add your Anthropic API key to activate the agent";
    el.keyStatus.classList.remove("ready");
  }
  el.workspaceInput.value = workspaceId;
}

el.saveKeyBtn.addEventListener("click", () => {
  const val = el.keyInput.value.trim();
  const workspaceVal = el.workspaceInput.value.trim();
  if (!val) return;
  try {
    localStorage.setItem(STORAGE_KEY, val);
    if (workspaceVal) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceVal);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  } catch {
    showError("Could not save the key in this browser's storage. It will still work for this session.");
  }
  refreshKeyStatus();
  el.keyDetails.open = false;
});

el.clearKeyBtn.addEventListener("click", () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {}
  el.keyInput.value = "";
  el.workspaceInput.value = "";
  refreshKeyStatus();
});

function showError(message) {
  el.errorBox.textContent = message;
  el.errorBox.hidden = false;
}

function clearError() {
  el.errorBox.hidden = true;
  el.errorBox.textContent = "";
}

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;
      return lib;
    });
  }
  return pdfjsPromise;
}

async function extractPdfText(file) {
  const pdfjsLib = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }
  return text.trim();
}

function renderFileList() {
  el.fileList.innerHTML = "";
  uploadedFiles.forEach((f) => {
    const li = document.createElement("li");
    li.className = "file-item";

    const statusLabel =
      f.status === "parsing" ? "reading…" : f.status === "error" ? "couldn't read" : `${f.text.length.toLocaleString()} chars`;

    const nameSpan = document.createElement("span");
    nameSpan.className = "file-name";
    nameSpan.textContent = f.name;

    const statusSpan = document.createElement("span");
    statusSpan.className = `file-status ${f.status}`;
    statusSpan.textContent = statusLabel;

    const removeBtn = document.createElement("button");
    removeBtn.className = "file-remove";
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", `Remove ${f.name}`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      uploadedFiles = uploadedFiles.filter((uf) => uf.id !== f.id);
      renderFileList();
    });

    li.append(nameSpan, statusSpan, removeBtn);
    el.fileList.appendChild(li);
  });
}

el.pdfInput.addEventListener("change", () => {
  const files = Array.from(el.pdfInput.files || []);
  el.pdfInput.value = ""; // allow re-selecting the same file later

  files.forEach((file) => {
    const entry = { id: `${file.name}-${Date.now()}-${Math.random()}`, name: file.name, status: "parsing", text: "", error: "" };
    uploadedFiles.push(entry);
    renderFileList();

    extractPdfText(file)
      .then((text) => {
        entry.status = "done";
        entry.text = text;
      })
      .catch((err) => {
        entry.status = "error";
        entry.error = err.message || "Failed to read PDF";
      })
      .finally(renderFileList);
  });
});

function getCombinedText() {
  const parts = [];
  const typed = el.textarea.value.trim();
  if (typed) parts.push(typed);
  uploadedFiles
    .filter((f) => f.status === "done" && f.text)
    .forEach((f) => parts.push(`--- From uploaded file: ${f.name} ---\n${f.text}`));
  return parts.join("\n\n");
}

function renderCompanyTabs() {
  el.companyTabs.innerHTML = "";
  companies.forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "company-tab" + (c.id === selectedCompanyId ? " active" : "");
    btn.textContent = c.name;
    btn.addEventListener("click", () => selectCompany(c.id));
    el.companyTabs.appendChild(btn);
  });
}

function selectCompany(id) {
  if (!companies.some((c) => c.id === id)) return;
  selectedCompanyId = id;
  try {
    localStorage.setItem(COMPANY_STORAGE_KEY, id);
  } catch {}

  const company = getCurrentCompany();
  document.documentElement.style.setProperty("--accent", company.accentColor || DEFAULT_ACCENT);

  const jobCount = company.jobs.length;
  el.badge.textContent =
    company.id === "yc"
      ? `Searching ${jobCount} real startup roles from ${company.name}`
      : `Searching ${jobCount} open roles at ${company.name}`;

  if (company.totalOpenRoles) {
    el.companyScaleNote.innerHTML =
      `Real scale: <span class="scale-total">${company.totalOpenRoles} open roles</span> right now at ${company.name} — ` +
      `<span class="scale-sample">this demo matches you against a curated sample of ${jobCount} of them.</span>`;
    el.companyScaleNote.title = company.totalOpenRolesSource || "";
  } else {
    el.companyScaleNote.textContent = "";
  }

  el.companySourceNote.textContent = `${company.sourceNote} (snapshot: ${company.snapshotDate})`;

  renderCompanyTabs();
  clearError();
  el.results.hidden = true;
}

async function loadJobs() {
  const res = await fetch("jobs.json");
  const data = await res.json();
  companies = data.companies;

  let initialId = null;
  try {
    initialId = localStorage.getItem(COMPANY_STORAGE_KEY);
  } catch {}
  if (!initialId || !companies.some((c) => c.id === initialId)) {
    initialId = companies[0]?.id;
  }
  selectCompany(initialId);
}

function buildPrompt(accomplishments) {
  const company = getCurrentCompany();
  const currentJobs = getCurrentJobs();

  const jobList = currentJobs
    .map((j) => {
      const orgLine = j.companyName ? `Posted by: ${j.companyName}\n` : "";
      return `ID: ${j.id}\n${orgLine}Title: ${j.title}\nCategory: ${j.category}\nLocation: ${j.location}\nType: ${j.jobType}\nDescription: ${j.description}\nRequirements: ${j.requirements.join("; ")}`;
    })
    .join("\n---\n");

  const sourceDescription =
    company.id === "yc"
      ? `the YC "Work at a Startup" job board, which lists real openings from many different YC-backed startups (each role below says which startup posted it)`
      : `${company.name}'s careers site`;

  return `You are a recruiting agent for ${sourceDescription}. A candidate has given you their background as free-form text — this may be hand-typed notes, text extracted from one or more uploaded PDFs (resume, LinkedIn "Save to PDF" export, work samples), or a mix of both, concatenated below with "--- From uploaded file: ... ---" markers where a file starts. Treat it all as one candidate. Your job: (1) build a short honest profile of them, and (2) match them against the real open roles listed below, ranking the ones genuinely worth their time.

CANDIDATE'S BACKGROUND (verbatim, plain text, possibly multiple sources):
"""
${accomplishments}
"""

OPEN ROLES:
${jobList}

Respond with ONLY a single JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "summary": "one or two sentence plain-English read on who this candidate is",
  "strengths": ["short bullet", "short bullet", ...],
  "growth_areas": ["short bullet", "short bullet", ...],
  "matches": [
    {
      "job_id": "the ID field from the role list above",
      "fit_score": 0-100 integer,
      "why_fit": "one or two sentences on why this specific role fits THIS candidate's actual background",
      "why_not_perfect": "one short honest sentence on the gap or stretch, or empty string if it's a strong match"
    }
  ]
}

Rules: only include roles in "matches" that are plausibly relevant (don't force-fit all ${currentJobs.length} roles) — typically 3 to 8 matches, sorted by fit_score descending. Be honest and specific, grounded in the actual role descriptions and the candidate's actual words, not generic reassurance.`;
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model response.");
  return JSON.parse(candidate.slice(start, end + 1));
}

async function callClaude(apiKey, prompt, workspaceId) {
  const headers = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
  if (workspaceId) {
    headers["anthropic-workspace-id"] = workspaceId;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try {
      detail = JSON.parse(body).error?.message || body;
    } catch {}
    if (res.status === 401) {
      throw new Error("Anthropic rejected that API key (401). Double-check it and try again.");
    }
    throw new Error(`Anthropic API error (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const text = data.content?.map((block) => block.text || "").join("") || "";
  return extractJson(text);
}

function renderResults(parsed) {
  el.agentSummary.textContent = parsed.summary || "";

  el.prosList.innerHTML = "";
  (parsed.strengths || []).forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s;
    el.prosList.appendChild(li);
  });

  el.consList.innerHTML = "";
  (parsed.growth_areas || []).forEach((c) => {
    const li = document.createElement("li");
    li.textContent = c;
    el.consList.appendChild(li);
  });

  el.matchesList.innerHTML = "";
  const matches = (parsed.matches || []).slice().sort((a, b) => b.fit_score - a.fit_score);

  if (matches.length === 0) {
    el.matchesList.innerHTML = `<p class="hint">No strong matches among today's open roles — but the agent read every one of them to check.</p>`;
  }

  matches.forEach((m) => {
    const job = getCurrentJobs().find((j) => j.id === m.job_id);
    if (!job) return;

    const card = document.createElement("div");
    card.className = "match-card";

    const scoreClass = m.fit_score >= 70 ? "" : "mid";
    const titleText = job.companyName ? `${job.title} — ${job.companyName}` : job.title;

    const top = document.createElement("div");
    top.className = "match-top";

    const left = document.createElement("div");
    const titleP = document.createElement("p");
    titleP.className = "match-title";
    titleP.textContent = titleText;
    const metaP = document.createElement("p");
    metaP.className = "match-meta";
    metaP.textContent = `${job.category} · ${job.location} · ${job.jobType}${job.payRange ? " · " + job.payRange : ""}`;
    left.append(titleP, metaP);

    const scoreSpan = document.createElement("span");
    scoreSpan.className = `fit-score ${scoreClass}`;
    scoreSpan.textContent = `${m.fit_score}% fit`;

    top.append(left, scoreSpan);
    card.appendChild(top);

    const whyP = document.createElement("p");
    whyP.className = "match-why";
    const strong = document.createElement("strong");
    strong.textContent = "Why this fits: ";
    whyP.append(strong, document.createTextNode(m.why_fit || ""));
    card.appendChild(whyP);

    if (m.why_not_perfect) {
      const caveatP = document.createElement("p");
      caveatP.className = "match-caveat";
      caveatP.textContent = `Worth knowing: ${m.why_not_perfect}`;
      card.appendChild(caveatP);
    }

    const link = document.createElement("a");
    link.className = "match-link";
    link.href = job.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "View original posting →";
    card.appendChild(link);

    el.matchesList.appendChild(card);
  });

  el.results.hidden = false;
}

el.matchBtn.addEventListener("click", async () => {
  clearError();
  const apiKey = getStoredKey();

  if (!apiKey) {
    showError("Add your Anthropic API key above first — the agent needs it to read your background.");
    el.keyDetails.open = true;
    return;
  }
  if (uploadedFiles.some((f) => f.status === "parsing")) {
    showError("Still reading your PDFs — give it a second and try again.");
    return;
  }
  const accomplishments = getCombinedText();
  if (!accomplishments) {
    showError("Paste in some accomplishments or upload a PDF first — even a few sentences is enough to get started.");
    return;
  }

  el.matchBtn.disabled = true;
  el.loading.hidden = false;
  el.results.hidden = true;

  try {
    const prompt = buildPrompt(accomplishments);
    const parsed = await callClaude(apiKey, prompt, getStoredWorkspaceId());
    renderResults(parsed);
  } catch (err) {
    showError(err.message || "Something went wrong talking to the recruiting agent. Try again.");
  } finally {
    el.matchBtn.disabled = false;
    el.loading.hidden = true;
  }
});

refreshKeyStatus();
loadJobs().catch(() => {
  el.badge.textContent = "Couldn't load job data";
});
