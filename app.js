/* =====================================================
   C.A.R.E. — Civic Action and Reporting Engine
   Advanced Frontend & GIS Engine
===================================================== */

"use strict";

/* =====================================================
   CONFIG & GLOBAL STORES
===================================================== */

const REPORT_STORAGE_KEY = "care_reports_v2";
const UPVOTE_STORAGE_KEY = "care_user_upvotes";
const THEME_STORAGE_KEY = "care_theme_preference";

// Supabase optional client setup
const SUPABASE_URL = "https://wcocovvkzxgxqbscyuuj.supabase.co";
const SUPABASE_KEY = "sb_publishable_DaY-2qm2HWCUuLfhaXwFFg_Eg05_MX3";

let supabaseClient = null;
if (window.supabase && typeof window.supabase.createClient === "function") {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
        console.warn("Supabase init fallback to local store:", e);
    }
}

// State
let globalReports = [];
let reportsMap = null;
let mapMarkers = [];
let pickerMap = null;
let pickerMarker = null;
let currentViewMode = "grid"; // 'grid' | 'map'
let activeFilterCategory = "ALL";
let activeFilterStatus = "ALL";
let searchQuery = "";

/* =====================================================
   DEPARTMENT & URGENCY MAPPINGS
===================================================== */

const MUNICIPAL_DEPARTMENTS = {
    "Pothole": "PWD / Road Maintenance",
    "Road Damage": "PWD / Civil Infrastructure",
    "Garbage": "Municipal Sanitation & Solid Waste",
    "Streetlight": "Electrical & Streetlighting Dept",
    "Drainage": "Water Supply & Sewerage Board",
    "Water": "Municipal Water Works",
    "Other": "Civic Helpdesk & General Services"
};

const CATEGORY_COLORS = {
    "Pothole": "#ef4444",
    "Road Damage": "#f97316",
    "Garbage": "#f59e0b",
    "Streetlight": "#eab308",
    "Drainage": "#3b82f6",
    "Water": "#06b6d4",
    "Other": "#64748b"
};

/* =====================================================
   DEMO DATA GENERATOR SEED
===================================================== */

const INITIAL_DEMO_REPORTS = [
    {
        id: "CARE-849201",
        title: "Deep Pothole Near Main Market Intersection",
        category: "Pothole",
        description: "Hazardous 8-inch deep pothole creating severe traffic congestion and hazard for two-wheelers during peak hours.",
        image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
        latitude: 28.6139,
        longitude: 77.2090,
        address: "Connaught Place Ring Road, Block B, New Delhi",
        citizenName: "Rahul Sharma",
        citizenMobile: "9876543210",
        citizenEmail: "rahul.sharma@gmail.com",
        status: "In Progress",
        urgency: "High",
        department: "PWD / Road Maintenance",
        slaTarget: "24 Hours",
        upvotes: 42,
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        assignedOfficer: "Eng. Vikram Singh (PWD Zone 4)",
        timeline: [
            { status: "Reported", time: "18 hrs ago", note: "Issue logged by citizen via C.A.R.E. Mobile portal." },
            { status: "Verified", time: "14 hrs ago", note: "AI scan & GIS coordinates validated by Control Room." },
            { status: "Assigned", time: "10 hrs ago", note: "Ticket dispatched to PWD Road Maintenance Division." },
            { status: "In Progress", time: "4 hrs ago", note: "Asphalt repair crew dispatched with heavy machinery." }
        ],
        comments: [
            { author: "Anish Gupta", time: "12 hrs ago", text: "I hit this exact pothole yesterday night! Please fix urgently." },
            { author: "Official Response", time: "4 hrs ago", text: "Patch work is currently underway. Expected completion by evening." }
        ]
    },
    {
        id: "CARE-710492",
        title: "Overflowing Garbage Dumpster near Primary School",
        category: "Garbage",
        description: "Garbage container has not been cleared for 3 days. Waste is spilling onto the pavement creating unhygienic conditions.",
        image: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
        latitude: 28.6250,
        longitude: 77.2180,
        address: "Sector 14 School Road, Near Gate 2, New Delhi",
        citizenName: "Priya Patel",
        citizenMobile: "9811223344",
        citizenEmail: "priya.patel@gmail.com",
        status: "Resolved",
        urgency: "Critical",
        department: "Municipal Sanitation & Solid Waste",
        slaTarget: "12 Hours",
        upvotes: 89,
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        resolvedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        resolutionPhoto: "https://images.unsplash.com/photo-1611284446314-60a55ac0d49d?auto=format&fit=crop&w=800&q=80",
        assignedOfficer: "Sanitation Inspector R. K. Verma",
        timeline: [
            { status: "Reported", time: "2 days ago", note: "Reported with photo verification." },
            { status: "Verified", time: "40 hrs ago", note: "High priority flag assigned due to school proximity." },
            { status: "In Progress", time: "24 hrs ago", note: "Compactor truck dispatched to clear location." },
            { status: "Resolved", time: "6 hrs ago", note: "Waste fully cleared and disinfectant sprayed. Site sanitized." }
        ],
        comments: [
            { author: "School Principal", time: "5 hrs ago", text: "Thank you C.A.R.E. team for resolving this so quickly!" }
        ]
    },
    {
        id: "CARE-932155",
        title: "Broken Streetlight Array on Outer Bypass",
        category: "Streetlight",
        description: "Continuous stretch of 5 streetlights non-functional, making the stretch dangerous for night commuters.",
        image: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80",
        latitude: 28.6010,
        longitude: 77.1990,
        address: "Outer Ring Flyover Lane 3, New Delhi",
        citizenName: "Amit Verma",
        citizenMobile: "9900112233",
        citizenEmail: "amit.v@gmail.com",
        status: "Verified",
        urgency: "Medium",
        department: "Electrical & Streetlighting Dept",
        slaTarget: "48 Hours",
        upvotes: 19,
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        assignedOfficer: "Electrical Sub-Div 2",
        timeline: [
            { status: "Reported", time: "6 hrs ago", note: "Submitted by resident." },
            { status: "Verified", time: "3 hrs ago", note: "Verified by Electrical Control Desk." }
        ],
        comments: []
    },
    {
        id: "CARE-648190",
        title: "Blocked Storm Drain Causing Street Waterlogging",
        category: "Drainage",
        description: "Heavy rain has caused rainwater blockage due to clogged drainage inlet near residential colony.",
        image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
        latitude: 28.6300,
        longitude: 77.2300,
        address: "Civil Lines Avenue, Block 5, New Delhi",
        citizenName: "Sunita Roy",
        citizenMobile: "9822334455",
        citizenEmail: "sunita.roy@gmail.com",
        status: "Reported",
        urgency: "High",
        department: "Water Supply & Sewerage Board",
        slaTarget: "24 Hours",
        upvotes: 27,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        timeline: [
            { status: "Reported", time: "2 hrs ago", note: "Issue logged with location coordinates." }
        ],
        comments: []
    }
];

/* =====================================================
   STORAGE MANAGERS
===================================================== */

function getReports() {
    try {
        const stored = localStorage.getItem(REPORT_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Error reading localStorage:", e);
    }
    // Seed initial data if empty
    saveReports(INITIAL_DEMO_REPORTS);
    return INITIAL_DEMO_REPORTS;
}

function saveReports(reports) {
    globalReports = reports;
    try {
        localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports));
    } catch (e) {
        console.error("Error writing localStorage:", e);
    }
}

function getUserUpvotes() {
    try {
        return JSON.parse(localStorage.getItem(UPVOTE_STORAGE_KEY) || "[]");
    } catch (e) {
        return [];
    }
}

function saveUserUpvotes(votes) {
    try {
        localStorage.setItem(UPVOTE_STORAGE_KEY, JSON.stringify(votes));
    } catch (e) {
        console.error("Error saving upvotes:", e);
    }
}

/* =====================================================
   PAGE NAVIGATION & ROUTING
===================================================== */

function showPage(pageName) {
    const pageIds = {
        home: "homePage",
        report: "reportPage",
        reports: "reportsPage",
        about: "aboutPage"
    };

    Object.values(pageIds).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove("active-page");
    });

    const activeEl = document.getElementById(pageIds[pageName]);
    if (activeEl) {
        activeEl.classList.add("active-page");
    }

    // Nav Link Highlights
    document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
    const navIndexMap = { home: 0, reports: 1, about: 2 };
    const links = document.querySelectorAll(".nav-link");
    if (navIndexMap[pageName] !== undefined && links[navIndexMap[pageName]]) {
        links[navIndexMap[pageName]].classList.add("active");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });

    // Page-specific triggers
    if (pageName === "reports") {
        renderReportsPage();
    } else if (pageName === "report") {
        setTimeout(initLocationPickerMap, 200);
    } else if (pageName === "home") {
        updateHeroMetrics();
    }
}

function startReport(categoryName) {
    showPage("report");
    const select = document.getElementById("category");
    if (select) {
        select.value = categoryName;
    }
    triggerAIScan();
}

/* =====================================================
   THEME SWITCHER (DARK / LIGHT)
===================================================== */

function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    updateThemeIcon(next);
    showToast(`Switched to ${next} theme mode.`);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById("themeToggleIcon");
    if (icon) {
        icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
}

/* =====================================================
   HERO METRICS & COUNTERS
===================================================== */

function updateHeroMetrics() {
    const reports = getReports();
    const heroCount = document.getElementById("heroReportCount");
    if (heroCount) heroCount.textContent = reports.length;
}

/* =====================================================
   LOCATION & GEOLOCATION (NOMINATIM REVERSE GEOCODE)
===================================================== */

function getLocation() {
    const locationText = document.getElementById("locationText");
    if (!locationText) return;

    if (!navigator.geolocation) {
        locationText.textContent = "GPS is not supported on this browser.";
        showToast("Geolocation unavailable");
        return;
    }

    locationText.textContent = "Detecting high-precision GPS location...";

    navigator.geolocation.getCurrentPosition(
        async position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            document.getElementById("latitude").value = lat;
            document.getElementById("longitude").value = lng;

            locationText.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

            // Reverse Geocode address
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                const data = await response.json();
                if (data && data.display_name) {
                    locationText.textContent = data.display_name;
                    const addressField = document.getElementById("citizenAddress");
                    if (addressField && !addressField.value) {
                        addressField.value = data.display_name;
                    }
                }
            } catch (e) {
                console.warn("Geocoding service note:", e);
            }

            // Update interactive picker map if open
            if (pickerMap && pickerMarker) {
                pickerMarker.setLatLng([lat, lng]);
                pickerMap.setView([lat, lng], 15);
            }

            showToast("Location captured successfully!");
        },
        error => {
            locationText.textContent = "Location permission denied or timed out.";
            showToast("Please allow location access in browser permissions.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function initLocationPickerMap() {
    const container = document.getElementById("locationMapPicker");
    if (!container || typeof L === "undefined") return;

    if (pickerMap) {
        pickerMap.invalidateSize();
        return;
    }

    const defaultLat = parseFloat(document.getElementById("latitude")?.value) || 28.6139;
    const defaultLng = parseFloat(document.getElementById("longitude")?.value) || 77.2090;

    pickerMap = L.map("locationMapPicker").setView([defaultLat, defaultLng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(pickerMap);

    pickerMarker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(pickerMap);

    pickerMarker.on("dragend", async function (e) {
        const latlng = e.target.getLatLng();
        document.getElementById("latitude").value = latlng.lat;
        document.getElementById("longitude").value = latlng.lng;

        const locationText = document.getElementById("locationText");
        if (locationText) {
            locationText.textContent = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
        }

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
            const data = await res.json();
            if (data && data.display_name && locationText) {
                locationText.textContent = data.display_name;
            }
        } catch (err) {}
    });

    pickerMap.on("click", function (e) {
        pickerMarker.setLatLng(e.latlng);
        document.getElementById("latitude").value = e.latlng.lat;
        document.getElementById("longitude").value = e.latlng.lng;
        pickerMarker.fire("dragend");
    });
}

/* =====================================================
   AI SMART SCANNER & CLASSIFIER
===================================================== */

function triggerAIScan() {
    const categoryVal = document.getElementById("category")?.value;
    const descVal = document.getElementById("description")?.value || "";
    const aiCard = document.getElementById("aiSmartCard");

    if (!aiCard) return;

    if (!categoryVal && descVal.length < 5) {
        aiCard.style.display = "none";
        return;
    }

    aiCard.style.display = "block";

    // Computed smart estimates based on category & text keywords
    const dept = MUNICIPAL_DEPARTMENTS[categoryVal] || "Municipal General Helpdesk";
    let urgency = "Medium";
    let sla = "48 Hours";
    let score = "85%";

    const lowerText = descVal.toLowerCase();
    if (lowerText.includes("urgent") || lowerText.includes("danger") || lowerText.includes("school") || lowerText.includes("accident") || lowerText.includes("overflow")) {
        urgency = "Critical";
        sla = "12 Hours";
        score = "96%";
    } else if (lowerText.includes("deep") || lowerText.includes("blocked") || lowerText.includes("dark") || lowerText.includes("major")) {
        urgency = "High";
        sla = "24 Hours";
        score = "91%";
    } else if (categoryVal === "Garbage") {
        urgency = "High";
        sla = "24 Hours";
        score = "89%";
    }

    document.getElementById("aiDeptVal").textContent = dept;
    document.getElementById("aiUrgencyVal").textContent = urgency;
    document.getElementById("aiSlaVal").textContent = sla;
    document.getElementById("aiScoreVal").textContent = score;

    const urgencyBadge = document.getElementById("aiUrgencyVal");
    if (urgencyBadge) {
        urgencyBadge.className = `ai-metric-val badge-urgency urgency-${urgency.toLowerCase()}`;
    }
}

/* =====================================================
   SUBMIT REPORT FORM
===================================================== */

async function handleReportSubmit(e) {
    e.preventDefault();

    const category = document.getElementById("category").value;
    const description = document.getElementById("description").value.trim();
    const citizenName = document.getElementById("citizenName")?.value.trim() || "Anonymous Citizen";
    const citizenMobile = document.getElementById("citizenMobile")?.value.trim() || "";
    const citizenEmail = document.getElementById("citizenEmail")?.value.trim() || "";
    const citizenAddress = document.getElementById("citizenAddress")?.value.trim() || "";
    const locationText = document.getElementById("locationText")?.textContent || "";
    const lat = parseFloat(document.getElementById("latitude")?.value) || 28.6139;
    const lng = parseFloat(document.getElementById("longitude")?.value) || 77.2090;

    if (!category || !description) {
        showToast("Please fill in category and description.");
        return;
    }

    const reportId = `CARE-${Math.floor(100000 + Math.random() * 900000)}`;

    // Read image preview or assign default sample photo based on category
    let imageSrc = null;
    const imgPreview = document.getElementById("imagePreview");
    if (imgPreview && imgPreview.src && !imgPreview.src.endsWith("#")) {
        imageSrc = imgPreview.src;
    } else {
        const categoryFallbackPhotos = {
            "Pothole": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
            "Garbage": "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
            "Streetlight": "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80",
            "Drainage": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
            "Road Damage": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
            "Other": "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80"
        };
        imageSrc = categoryFallbackPhotos[category] || categoryFallbackPhotos["Other"];
    }

    const dept = MUNICIPAL_DEPARTMENTS[category] || "Civic Helpdesk";
    const urgency = document.getElementById("aiUrgencyVal")?.textContent || "Medium";
    const slaTarget = document.getElementById("aiSlaVal")?.textContent || "48 Hours";

    const newReport = {
        id: reportId,
        title: `${category} Issue at ${citizenAddress.slice(0, 30) || "Geotagged Location"}`,
        category: category,
        description: description,
        image: imageSrc,
        latitude: lat,
        longitude: lng,
        address: citizenAddress || locationText || "Geotagged Spot",
        citizenName: citizenName,
        citizenMobile: citizenMobile,
        citizenEmail: citizenEmail,
        status: "Reported",
        urgency: urgency,
        department: dept,
        slaTarget: slaTarget,
        upvotes: 1,
        createdAt: new Date().toISOString(),
        timeline: [
            { status: "Reported", time: "Just now", note: "Report created and submitted by citizen via C.A.R.E. Engine." }
        ],
        comments: []
    };

    const reports = getReports();
    reports.unshift(newReport);
    saveReports(reports);

    // Reset Form
    document.getElementById("issueForm").reset();
    if (imgPreview) imgPreview.src = "";
    document.getElementById("imagePreviewContainer").style.display = "none";
    document.getElementById("aiSmartCard").style.display = "none";

    showToast(`Report Submitted! Ticket ID: ${reportId}`);
    showPage("reports");
}

/* =====================================================
   UPVOTING SYSTEM
===================================================== */

function toggleUpvote(reportId, e) {
    if (e) e.stopPropagation();

    const reports = getReports();
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const userVotes = getUserUpvotes();
    const hasVoted = userVotes.includes(reportId);

    if (hasVoted) {
        report.upvotes = Math.max(0, (report.upvotes || 1) - 1);
        const idx = userVotes.indexOf(reportId);
        if (idx > -1) userVotes.splice(idx, 1);
        showToast("Endorsement removed.");
    } else {
        report.upvotes = (report.upvotes || 0) + 1;
        userVotes.push(reportId);
        showToast("Report endorsed! Priority boosted.");
    }

    saveUserUpvotes(userVotes);
    saveReports(reports);
    renderReportsPage();
}

/* =====================================================
   RENDER REPORTS & GIS MAP PAGE
===================================================== */

function setViewMode(mode) {
    currentViewMode = mode;
    document.getElementById("gridViewBtn")?.classList.toggle("active", mode === "grid");
    document.getElementById("mapViewBtn")?.classList.toggle("active", mode === "map");
    renderReportsPage();
}

function applyFilters() {
    activeFilterCategory = document.getElementById("filterCategory")?.value || "ALL";
    activeFilterStatus = document.getElementById("filterStatus")?.value || "ALL";
    searchQuery = document.getElementById("searchInput")?.value.toLowerCase().trim() || "";
    renderReportsPage();
}

function renderReportsPage() {
    const reports = getReports();

    // Filter Logic
    const filtered = reports.filter(r => {
        const matchesCategory = activeFilterCategory === "ALL" || r.category === activeFilterCategory;
        const matchesStatus = activeFilterStatus === "ALL" || r.status === activeFilterStatus;
        const matchesSearch = !searchQuery ||
            r.id.toLowerCase().includes(searchQuery) ||
            r.title.toLowerCase().includes(searchQuery) ||
            r.description.toLowerCase().includes(searchQuery) ||
            (r.address && r.address.toLowerCase().includes(searchQuery));
        return matchesCategory && matchesStatus && matchesSearch;
    });

    // Update Statistics Bar
    const totalEl = document.getElementById("totalIssues");
    const verifiedEl = document.getElementById("verifiedIssues");
    const progressEl = document.getElementById("progressIssues");
    const resolvedEl = document.getElementById("resolvedIssues");

    if (totalEl) totalEl.textContent = reports.length;
    if (verifiedEl) verifiedEl.textContent = reports.filter(r => r.status === "Verified").length;
    if (progressEl) progressEl.textContent = reports.filter(r => r.status === "In Progress").length;
    if (resolvedEl) resolvedEl.textContent = reports.filter(r => r.status === "Resolved").length;

    const container = document.getElementById("issuesContainer");
    const mapBox = document.getElementById("reportsMapContainer");

    if (!container) return;

    if (currentViewMode === "map") {
        container.style.display = "none";
        if (mapBox) mapBox.style.display = "block";
        renderLeafletMap(filtered);
    } else {
        if (mapBox) mapBox.style.display = "none";
        container.style.display = "grid";
        renderGridCards(filtered, container);
    }
}

function renderGridCards(reports, container) {
    if (reports.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align:center; padding:50px 20px;">
                <i class="fa-solid fa-folder-open" style="font-size:42px; color:#94a3b8; margin-bottom:12px;"></i>
                <h3>No civic reports found</h3>
                <p>Try adjusting your search query or category filter.</p>
            </div>
        `;
        return;
    }

    const userVotes = getUserUpvotes();

    container.innerHTML = reports.map(r => {
        const isVoted = userVotes.includes(r.id);
        const dateStr = new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const urgencyClass = `urgency-${(r.urgency || "medium").toLowerCase()}`;

        return `
            <div class="issue-card" onclick="openIssueDetailModal('${r.id}')" style="cursor:pointer;">
                <div style="position:relative;">
                    <img src="${escapeHTML(r.image)}" alt="${escapeHTML(r.title)}" class="issue-image">
                    <span class="badge badge-status status-${(r.status || "Reported").toLowerCase().replace(/\s+/g, '-')}" style="position:absolute; top:12px; right:12px;">
                        ${escapeHTML(r.status)}
                    </span>
                    <span class="badge-urgency ${urgencyClass}" style="position:absolute; top:12px; left:12px;">
                        ${escapeHTML(r.urgency || "Medium")}
                    </span>
                </div>
                <div class="issue-content" style="padding:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size:12px; font-weight:700; color:#0b5ed7;">
                            <i class="fa-solid fa-tag"></i> ${escapeHTML(r.category)}
                        </span>
                        <span style="font-size:11px; color:#64748b; font-weight:600;">
                            ${escapeHTML(r.id)}
                        </span>
                    </div>
                    <h3 class="issue-title" style="font-size:16px; margin-bottom:8px;">${escapeHTML(r.title)}</h3>
                    <p class="issue-description" style="font-size:13px; color:#64748b; margin-bottom:14px; line-clamp:2;">
                        ${escapeHTML(r.description)}
                    </p>
                    <div class="issue-meta" style="display:flex; align-items:center; justify-content:space-between; border-top:1px solid var(--card-border); padding-top:12px;">
                        <div style="font-size:12px; color:#64748b;">
                            <i class="fa-solid fa-location-dot"></i> ${escapeHTML(r.address.slice(0, 24))}...
                        </div>
                        <button type="button" class="upvote-action-btn ${isVoted ? 'voted' : ''}" onclick="toggleUpvote('${r.id}', event)">
                            <i class="fa-solid fa-circle-chevron-up"></i> ${r.upvotes || 0}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

/* =====================================================
   LEAFLET GIS MAP RENDERER
===================================================== */

function renderLeafletMap(reports) {
    const mapContainer = document.getElementById("reportsMap");
    if (!mapContainer || typeof L === "undefined") return;

    if (!reportsMap) {
        reportsMap = L.map("reportsMap").setView([28.6139, 77.2090], 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; C.A.R.E. GIS Engine | OpenStreetMap'
        }).addTo(reportsMap);
    }

    // Clear old markers
    mapMarkers.forEach(m => reportsMap.removeLayer(m));
    mapMarkers = [];

    if (reports.length === 0) return;

    const bounds = [];

    reports.forEach(r => {
        if (!r.latitude || !r.longitude) return;

        const color = CATEGORY_COLORS[r.category] || "#0b5ed7";
        const customIcon = L.divIcon({
            className: "custom-leaflet-pin",
            html: `<div style="background-color:${color}; width:28px; height:28px; border-radius:50%; border:3px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.3); display:grid; place-items:center; color:white; font-size:11px;"><i class="fa-solid fa-circle"></i></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const marker = L.marker([r.latitude, r.longitude], { icon: customIcon }).addTo(reportsMap);

        const popupContent = `
            <div class="map-popup-card">
                <img src="${escapeHTML(r.image)}" class="map-popup-thumb" alt="Issue">
                <div class="map-popup-title">${escapeHTML(r.title)}</div>
                <div class="map-popup-address"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(r.address.slice(0, 30))}</div>
                <button type="button" class="map-popup-btn" onclick="openIssueDetailModal('${r.id}')">Inspect Issue Details</button>
            </div>
        `;

        marker.bindPopup(popupContent);
        mapMarkers.push(marker);
        bounds.push([r.latitude, r.longitude]);
    });

    if (bounds.length > 0) {
        reportsMap.fitBounds(bounds, { padding: [50, 50] });
    }

    setTimeout(() => reportsMap.invalidateSize(), 200);
}

/* =====================================================
   TICKET LOOKUP SEARCH
===================================================== */

function handleTicketLookup(e) {
    if (e) e.preventDefault();
    const query = document.getElementById("ticketLookupInput")?.value.trim();
    if (!query) return;

    const reports = getReports();
    const found = reports.find(r => r.id.toLowerCase() === query.toLowerCase() || (r.citizenEmail && r.citizenEmail.toLowerCase() === query.toLowerCase()));

    if (found) {
        openIssueDetailModal(found.id);
    } else {
        showToast(`No report found matching ticket ID or email "${query}"`);
    }
}

/* =====================================================
   ISSUE DETAIL INSPECTION MODAL
===================================================== */

function openIssueDetailModal(reportId) {
    const reports = getReports();
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const modal = document.getElementById("issueDetailModal");
    const modalBody = document.getElementById("issueModalContent");
    if (!modal || !modalBody) return;

    const userVotes = getUserUpvotes();
    const isVoted = userVotes.includes(report.id);
    const dateStr = new Date(report.createdAt).toLocaleString();

    // Render Timeline Steps
    const timeline = report.timeline || [
        { status: "Reported", time: "Logged", note: "Report submitted." }
    ];

    const timelineHTML = timeline.map((t, idx) => `
        <div class="timeline-step-item ${idx === timeline.length - 1 ? 'active' : 'completed'}">
            <div class="timeline-node-icon"><i class="fa-solid fa-check"></i></div>
            <div class="timeline-step-title">${escapeHTML(t.status)}</div>
            <div class="timeline-step-time">${escapeHTML(t.time)}</div>
            <div class="timeline-step-note">${escapeHTML(t.note)}</div>
        </div>
    `).join("");

    // Proof photos section if resolved
    let proofHTML = "";
    if (report.status === "Resolved" && report.resolutionPhoto) {
        proofHTML = `
            <h4 style="margin:20px 0 10px; font-size:15px;"><i class="fa-solid fa-camera-rotate" style="color:#16a34a;"></i> Resolution Proof Comparison</h4>
            <div class="before-after-box">
                <div class="proof-photo-item">
                    <img src="${escapeHTML(report.image)}" alt="Before">
                    <span class="proof-label before">Before Report</span>
                </div>
                <div class="proof-photo-item">
                    <img src="${escapeHTML(report.resolutionPhoto)}" alt="After">
                    <span class="proof-label after">Resolved Proof</span>
                </div>
            </div>
        `;
    }

    // Comments section
    const comments = report.comments || [];
    const commentsHTML = comments.map(c => `
        <div style="background:var(--bg-body); padding:10px 14px; border-radius:10px; margin-top:8px; border:1px solid var(--card-border);">
            <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:2px;">
                <span>${escapeHTML(c.author)}</span>
                <span style="color:var(--muted); font-weight:normal;">${escapeHTML(c.time)}</span>
            </div>
            <p style="font-size:13px; color:var(--text-main); margin:0;">${escapeHTML(c.text)}</p>
        </div>
    `).join("");

    modalBody.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
            <div>
                <span class="badge badge-status status-${(report.status || "Reported").toLowerCase().replace(/\s+/g, '-')}">${escapeHTML(report.status)}</span>
                <span class="badge-urgency urgency-${(report.urgency || "medium").toLowerCase()}" style="margin-left:8px;">${escapeHTML(report.urgency || "Medium")} Priority</span>
                <h2 style="font-size:20px; font-weight:800; margin-top:8px;">${escapeHTML(report.title)}</h2>
                <div style="font-size:12px; color:var(--muted); margin-top:4px;">
                    Ticket ID: <strong>${escapeHTML(report.id)}</strong> &bull; Logged: ${dateStr}
                </div>
            </div>
            <button type="button" class="upvote-action-btn ${isVoted ? 'voted' : ''}" onclick="toggleUpvote('${report.id}'); openIssueDetailModal('${report.id}');">
                <i class="fa-solid fa-circle-chevron-up"></i> ${report.upvotes || 0} Upvotes
            </button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
            <div>
                <img src="${escapeHTML(report.image)}" style="width:100%; max-height:280px; object-fit:cover; border-radius:14px; margin-bottom:14px;" alt="Issue Photo">
                <div style="background:var(--bg-body); padding:14px; border-radius:12px; border:1px solid var(--card-border);">
                    <div style="font-size:12px; color:var(--muted); font-weight:700;">LOCATION ADDRESS</div>
                    <div style="font-size:14px; font-weight:600; margin-top:2px;"><i class="fa-solid fa-location-dot" style="color:#ef4444;"></i> ${escapeHTML(report.address)}</div>
                </div>

                <div style="margin-top:14px; background:var(--bg-body); padding:14px; border-radius:12px; border:1px solid var(--card-border);">
                    <div style="font-size:12px; color:var(--muted); font-weight:700;">ASSIGNED MUNICIPAL DEPT</div>
                    <div style="font-size:14px; font-weight:700; color:#0b5ed7; margin-top:2px;"><i class="fa-solid fa-building-flag"></i> ${escapeHTML(report.department || "PWD")}</div>
                    ${report.assignedOfficer ? `<div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Officer: ${escapeHTML(report.assignedOfficer)}</div>` : ''}
                </div>
            </div>

            <div>
                <h4 style="font-size:15px; margin-bottom:6px;">Issue Description</h4>
                <p style="font-size:14px; color:var(--text-main); line-height:1.6; background:var(--bg-body); padding:14px; border-radius:12px; border:1px solid var(--card-border); margin-bottom:16px;">
                    ${escapeHTML(report.description)}
                </p>

                <h4 style="font-size:15px; margin-bottom:10px;"><i class="fa-solid fa-list-check"></i> Audit Timeline & Workflow Status</h4>
                <div class="timeline-container">
                    ${timelineHTML}
                </div>

                ${proofHTML}

                <div style="margin-top:20px;">
                    <h4 style="font-size:14px; margin-bottom:8px;"><i class="fa-solid fa-comments"></i> Community Updates & Notes (${comments.length})</h4>
                    ${commentsHTML}
                    <div style="display:flex; gap:8px; margin-top:12px;">
                        <input type="text" id="newCommentInput" placeholder="Add a public comment..." style="flex:1; padding:8px 12px; border-radius:8px; border:1px solid var(--card-border); font-size:13px; outline:none;">
                        <button type="button" onclick="addCommentToReport('${report.id}')" style="padding:8px 14px; background:#0b5ed7; color:white; border:none; border-radius:8px; font-weight:700; font-size:13px;">Post</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeIssueDetailModal() {
    const modal = document.getElementById("issueDetailModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
    }
}

function addCommentToReport(reportId) {
    const input = document.getElementById("newCommentInput");
    if (!input || !input.value.trim()) return;

    const reports = getReports();
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    if (!report.comments) report.comments = [];
    report.comments.push({
        author: "Citizen Contributor",
        time: "Just now",
        text: input.value.trim()
    });

    saveReports(reports);
    openIssueDetailModal(reportId);
    showToast("Comment added!");
}

/* =====================================================
   HELPER UTILS & TOAST
===================================================== */

function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMessage");

    if (toast && toastMsg) {
        toastMsg.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3500);
    }
}

function escapeHTML(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =====================================================
   INITIALIZATION
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initTheme();

    // Attach form submit handler
    const issueForm = document.getElementById("issueForm");
    if (issueForm) {
        issueForm.addEventListener("submit", handleReportSubmit);
    }

    // Attach image preview listeners
    const imageInput = document.getElementById("image");
    if (imageInput) {
        imageInput.addEventListener("change", e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    const imgPreview = document.getElementById("imagePreview");
                    const container = document.getElementById("imagePreviewContainer");
                    if (imgPreview && container) {
                        imgPreview.src = evt.target.result;
                        container.style.display = "flex";
                        triggerAIScan();
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const removeImgBtn = document.getElementById("removeImageBtn");
    if (removeImgBtn) {
        removeImgBtn.addEventListener("click", () => {
            const imageInput = document.getElementById("image");
            if (imageInput) imageInput.value = "";
            const imgPreview = document.getElementById("imagePreview");
            if (imgPreview) imgPreview.src = "";
            const container = document.getElementById("imagePreviewContainer");
            if (container) container.style.display = "none";
        });
    }

    // Category & Description change for AI Scanner
    document.getElementById("category")?.addEventListener("change", triggerAIScan);
    document.getElementById("description")?.addEventListener("input", triggerAIScan);

    // Initial Render
    getReports();
    updateHeroMetrics();
});
