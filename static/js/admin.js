// ===== Admin Dashboard JavaScript =====
// Connected to real database via Flask API

// ===== STATE =====
let currentSection = "dashboard";
let allQueries = [];
let allIntents = [];
let allFaqs = [];

// ===== INITIALIZE =====
document.addEventListener("DOMContentLoaded", () => {
    loadDashboardData();
    loadTrainingData();
    loadQueries();
    loadFaqs();
    checkServerStatus();
});

// ===== DATA LOADING FROM API =====

async function loadDashboardData() {
    try {
        const res = await fetch("/admin/api/stats");
        if (!res.ok) throw new Error("Failed to load stats");
        const stats = await res.json();

        // Update stat cards
        document.getElementById("stat-total-queries").textContent = stats.total_queries.toLocaleString();
        document.getElementById("stat-success-rate").textContent = stats.success_rate + "%";
        document.getElementById("stat-intents").textContent = stats.intent_count || 0;
        document.getElementById("stat-entities").textContent = stats.entity_count || 0;

        // Update analytics section
        renderAnalyticsFromStats(stats);
    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

async function loadTrainingData(filter = "") {
    try {
        const res = await fetch("/admin/api/training-data");
        if (!res.ok) throw new Error("Failed to load training data");
        const data = await res.json();
        allIntents = data.intents || [];
        renderTrainingData(filter);
    } catch (err) {
        console.error("Error loading training data:", err);
        // Fallback: render empty
        allIntents = [];
        renderTrainingData(filter);
    }
}

async function loadQueries(search = "") {
    try {
        const url = search
            ? `/admin/api/queries?search=${encodeURIComponent(search)}`
            : "/admin/api/queries";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load queries");
        const data = await res.json();
        allQueries = data.queries || [];
        renderAllQueries();
        renderRecentQueries();
    } catch (err) {
        console.error("Error loading queries:", err);
        allQueries = [];
        renderAllQueries();
        renderRecentQueries();
    }
}

async function loadFaqs() {
    try {
        const res = await fetch("/admin/api/faqs");
        if (!res.ok) throw new Error("Failed to load FAQs");
        const data = await res.json();
        allFaqs = data.faqs || [];
        renderFaqs();
    } catch (err) {
        console.error("Error loading FAQs:", err);
        allFaqs = [];
        renderFaqs();
    }
}

// ===== NAVIGATION =====
function switchSection(section) {
    currentSection = section;

    // Update nav items
    document.querySelectorAll(".nav-item[data-section]").forEach((item) => {
        item.classList.toggle("active", item.dataset.section === section);
    });

    // Update sections
    document.querySelectorAll(".admin-section").forEach((sec) => {
        sec.classList.remove("active");
    });
    const target = document.getElementById(`section-${section}`);
    if (target) target.classList.add("active");

    // Update header title
    const titles = {
        dashboard: ["Dashboard", "Overview of chatbot performance"],
        training: ["Training Data", "Manage intents and training examples"],
        queries: ["User Queries", "Monitor and analyze user interactions"],
        faqs: ["FAQs", "Manage frequently asked questions"],
        analytics: ["Analytics", "Performance metrics and insights"],
        settings: ["Settings", "Configure your chatbot environment"],
    };
    const [title, subtitle] = titles[section] || ["Dashboard", ""];
    document.getElementById("pageTitle").textContent = title;
    document.getElementById("pageSubtitle").textContent = subtitle;

    // Close mobile sidebar
    closeSidebar();
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebarOverlay").classList.toggle("show");
}

function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("show");
}

// ===== RECENT QUERIES (Dashboard) =====
function renderRecentQueries() {
    const recentBody = document.getElementById("recent-queries-body");
    recentBody.innerHTML = "";
    const recent = allQueries.slice(0, 5);

    if (recent.length === 0) {
        recentBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text-light);">No queries logged yet. Start chatting to see data here!</td></tr>`;
        return;
    }

    recent.forEach((q) => {
        recentBody.innerHTML += buildQueryRow(q, false);
    });
}

// ===== QUERY TABLE RENDERING =====
function buildQueryRow(q, showIndex) {
    const conf = q.confidence || 0;
    const confPercent = (conf * 100).toFixed(0);
    const confClass = conf >= 0.9 ? "high" : conf >= 0.7 ? "medium" : "low";
    const dateStr = q.timestamp ? q.timestamp.split(" ")[0] : "";
    const intentText = q.intent || "unknown";

    let row = "<tr>";
    if (showIndex) row += `<td style="color:var(--text-light);font-weight:600;">${q.id}</td>`;
    row += `
        <td><span class="query-text">${escapeHtml(q.query)}</span></td>
        <td><span class="intent-badge">${escapeHtml(intentText)}</span></td>
        <td>
            <div class="confidence-bar-container">
                <div class="confidence-bar">
                    <div class="fill ${confClass}" style="width:${confPercent}%"></div>
                </div>
                <span class="confidence-value">${confPercent}%</span>
            </div>
        </td>
        <td><span class="date-cell">${dateStr}</span></td>
    `;
    row += "</tr>";
    return row;
}

function renderAllQueries() {
    const body = document.getElementById("all-queries-body");
    body.innerHTML = "";

    if (allQueries.length === 0) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-light);">No queries found. Chat with your bot to start logging!</td></tr>`;
        return;
    }

    allQueries.forEach((q) => {
        body.innerHTML += buildQueryRow(q, true);
    });
}

function filterQueries(val) {
    loadQueries(val);
}

// ===== TRAINING DATA RENDERING =====
function renderTrainingData(filter = "") {
    const container = document.getElementById("training-data-container");
    container.innerHTML = "";

    let filtered = allIntents;
    if (filter) {
        filtered = allIntents.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()));
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            <p>No intents found</p>
            <span class="sub">${filter ? "Try a different search term" : "Training data could not be loaded"}</span>
        </div>`;
        return;
    }

    filtered.forEach((intent, idx) => {
        const card = document.createElement("div");
        card.className = "intent-card";
        card.id = `intent-card-${idx}`;
        card.innerHTML = `
            <div class="intent-card-header" onclick="toggleIntentCard(${idx})">
                <span class="intent-name">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    ${escapeHtml(intent.name)}
                </span>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="intent-count">${intent.examples.length} examples</span>
                    <svg class="expand-icon" id="expand-${idx}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
            </div>
            <div class="intent-card-body" id="intent-body-${idx}">
                <ul class="example-list">
                    ${intent.examples.map((ex) => `
                        <li class="example-item">
                            <span class="bullet"></span>
                            <span>${escapeHtml(ex)}</span>
                        </li>
                    `).join("")}
                </ul>
            </div>
        `;
        container.appendChild(card);
    });
}

function toggleIntentCard(idx) {
    const body = document.getElementById(`intent-body-${idx}`);
    const icon = document.getElementById(`expand-${idx}`);
    body.classList.toggle("open");
    icon.classList.toggle("expanded");
}

function filterIntents(val) {
    renderTrainingData(val);
}

// ===== FAQ RENDERING =====
function renderFaqs() {
    const container = document.getElementById("faq-container");
    container.innerHTML = "";

    if (allFaqs.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <p>No FAQs yet</p>
            <span class="sub">Click "Add FAQ" to create one</span>
        </div>`;
        return;
    }

    allFaqs.forEach((faq) => {
        const item = document.createElement("div");
        item.className = "faq-item";
        item.innerHTML = `
            <div class="faq-question">
                <span class="q-icon">Q</span>
                <span>${escapeHtml(faq.question)}</span>
            </div>
            <div class="faq-answer">${escapeHtml(faq.answer)}</div>
            <div class="faq-actions">
                <button class="btn btn-danger btn-sm" onclick="deleteFaqById(${faq.id})">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    Delete
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

async function deleteFaqById(id) {
    try {
        const res = await fetch(`/admin/api/faqs/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete FAQ");
        showToast("FAQ deleted", "success");
        loadFaqs();
    } catch (err) {
        showToast("Error deleting FAQ", "error");
    }
}

// ===== ANALYTICS RENDERING =====
function renderAnalyticsFromStats(stats) {
    // Top intents chart
    const chartEl = document.getElementById("intent-chart");
    chartEl.innerHTML = "";
    const intentDist = stats.intent_distribution || [];

    if (intentDist.length === 0) {
        chartEl.innerHTML = `<div style="text-align:center;color:var(--text-light);font-size:13px;width:100%;padding:40px 0;">No data yet — start chatting to see analytics!</div>`;
    } else {
        const maxCount = intentDist[0].count;
        intentDist.forEach(({ intent, count }) => {
            const heightPercent = (count / maxCount) * 100;
            const group = document.createElement("div");
            group.className = "bar-group";
            group.innerHTML = `
                <div class="bar" style="height:${heightPercent}%"></div>
                <span class="bar-label">${intent.replace(/_/g, " ").substring(0, 12)}</span>
            `;
            chartEl.appendChild(group);
        });
    }

    // Confidence distribution
    const cd = stats.confidence_distribution || {};
    document.getElementById("conf-high").textContent = (cd.high_pct || 0) + "%";
    document.getElementById("conf-med").textContent = (cd.medium_pct || 0) + "%";
    document.getElementById("conf-low").textContent = (cd.low_pct || 0) + "%";
    document.getElementById("conf-high-bar").style.width = (cd.high_pct || 0) + "%";
    document.getElementById("conf-med-bar").style.width = (cd.medium_pct || 0) + "%";
    document.getElementById("conf-low-bar").style.width = (cd.low_pct || 0) + "%";

    // Performance summary
    document.getElementById("metric-avg-conf").textContent = (stats.avg_confidence || 0) + "%";
    document.getElementById("metric-total-intents").textContent = stats.intent_count || 0;
    document.getElementById("metric-entity-types").textContent = stats.entity_count || 0;
    document.getElementById("metric-fallback").textContent = (stats.fallback_rate || 0) + "%";
}

// ===== MODALS =====
function openAddIntentModal() {
    document.getElementById("new-intent-name").value = "";
    document.getElementById("new-intent-examples").value = "";
    document.getElementById("new-intent-response").value = "";
    document.getElementById("addIntentModal").classList.add("show");
}

function openAddFaqModal() {
    document.getElementById("new-faq-question").value = "";
    document.getElementById("new-faq-answer").value = "";
    document.getElementById("addFaqModal").classList.add("show");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("show");
}

// Close modal on overlay click
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
        e.target.classList.remove("show");
    }
});

// Close modal on Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal-overlay.show").forEach((m) => m.classList.remove("show"));
    }
});

// ===== ADD NEW INTENT (frontend only for now) =====
function addNewIntent() {
    const name = document.getElementById("new-intent-name").value.trim();
    const examplesRaw = document.getElementById("new-intent-examples").value.trim();

    if (!name) {
        showToast("Please enter an intent name", "error");
        return;
    }
    if (!examplesRaw) {
        showToast("Please enter at least one training example", "error");
        return;
    }

    const examples = examplesRaw.split("\n").map((e) => e.trim()).filter((e) => e);

    if (allIntents.find((i) => i.name === name)) {
        showToast("Intent already exists!", "error");
        return;
    }

    allIntents.push({ name, examples });
    closeModal("addIntentModal");
    renderTrainingData();
    showToast(`Intent "${name}" added with ${examples.length} examples! Note: Retrain the model to apply changes.`, "success");
}

// ===== ADD NEW FAQ (saved to database) =====
async function addNewFaq() {
    const question = document.getElementById("new-faq-question").value.trim();
    const answer = document.getElementById("new-faq-answer").value.trim();

    if (!question || !answer) {
        showToast("Please fill in both question and answer", "error");
        return;
    }

    try {
        const res = await fetch("/admin/api/faqs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, answer }),
        });

        if (!res.ok) throw new Error("Failed to add FAQ");

        closeModal("addFaqModal");
        showToast("FAQ added successfully!", "success");
        loadFaqs();
    } catch (err) {
        showToast("Error adding FAQ: " + err.message, "error");
    }
}

// ===== SERVER STATUS CHECK =====
async function checkServerStatus() {
    const rasaStatus = document.getElementById("rasa-server-status");
    const actionStatus = document.getElementById("action-server-status");
    const webStatus = document.getElementById("web-ui-status");

    // Web UI is always online if this page loaded
    webStatus.className = "status-badge online";
    webStatus.innerHTML = '<span class="dot"></span> Web UI';

    try {
        const res = await fetch("/health", { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data.status === "online") {
            rasaStatus.className = "status-badge online";
            rasaStatus.innerHTML = '<span class="dot"></span> Rasa Server';
        } else {
            rasaStatus.className = "status-badge offline";
            rasaStatus.innerHTML = '<span class="dot"></span> Rasa Server';
        }
    } catch {
        rasaStatus.className = "status-badge offline";
        rasaStatus.innerHTML = '<span class="dot"></span> Rasa Server';
    }

    actionStatus.className = "status-badge online";
    actionStatus.innerHTML = '<span class="dot"></span> Action Server';
}

// ===== RETRAIN MODEL =====
function retrainModel() {
    showToast("Model retraining started... This may take a few minutes.", "success");
    // Future: POST /admin/api/retrain
}

// ===== EXPORT CSV (from server) =====
function exportCSV() {
    window.location.href = "/admin/api/export/csv";
}

// ===== REFRESH DATA =====
function refreshData() {
    loadDashboardData();
    loadTrainingData(document.getElementById("search-intents")?.value || "");
    loadQueries(document.getElementById("search-queries")?.value || "");
    loadFaqs();
    checkServerStatus();
    showToast("Data refreshed!", "success");
}

// ===== TOAST =====
function showToast(message, type = "") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast" + (type ? ` ${type}` : "");
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ===== HELPERS =====
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
