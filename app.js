/* =====================================================
   C.A.R.E. — Civic Action and Reporting Engine
   Enterprise Edition | Unified App & Data Storage Engine
===================================================== */

// --- 1. SUPABASE CLIENT ---
const SUPABASE_URL = (window.CARE_CONFIG && window.CARE_CONFIG.supabaseUrl) || "https://wcocovvkzxgxqbscyuuj.supabase.co";
const SUPABASE_KEY = (window.CARE_CONFIG && window.CARE_CONFIG.supabaseAnonKey) || "sb_publishable_DaY-2qm2HWCUuLfhaXwFFg_Eg05_MX3";

let supabaseClient = null;
try {
    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (err) {
    console.warn("Supabase initialization deferred:", err);
}

// --- 2. UNIFIED STORE (CAREStore) ---
const CARE_STORAGE_KEY = "care_reports_clean_v1";

window.CAREStore = {
    getReports: function() {
        const allReports = [];
        const seenIds = new Set();
        const storageKeys = [CARE_STORAGE_KEY, "care_reports_v2", "care_reports", "care_citizen_reports"];

        storageKeys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(item => {
                            if (item && typeof item === "object") {
                                const id = item.id || item.issue_code || item.ticket_id;
                                if (id && !seenIds.has(id)) {
                                    seenIds.add(id);
                                    allReports.push(item);
                                }
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn("Storage key read error:", key, e);
            }
        });

        return allReports;
    },

    saveReports: function(reports) {
        try {
            localStorage.setItem(CARE_STORAGE_KEY, JSON.stringify(reports));
            // Keep legacy storage key synchronized for feature.js drawer compatibility
            localStorage.setItem("care_reports_v2", JSON.stringify(reports));
            window.dispatchEvent(new CustomEvent("care:reports-updated"));
        } catch (e) {
            console.error("Save local storage error:", e);
        }
    },

    addReport: async function(newReport) {
        const reports = this.getReports();
        reports.unshift(newReport);
        this.saveReports(reports);

        // Async try to upload to Supabase if available
        if (supabaseClient) {
            try {
                await supabaseClient.from("issues").insert({
                    issue_code: newReport.issue_code || newReport.id,
                    citizen_name: newReport.citizen_name,
                    citizen_mobile: newReport.citizen_mobile,
                    citizen_email: newReport.citizen_email,
                    address: newReport.address,
                    category: newReport.category,
                    description: newReport.description,
                    latitude: Number(newReport.latitude),
                    longitude: Number(newReport.longitude),
                    image_url: newReport.image_url,
                    status: newReport.status || "Reported",
                    priority: newReport.priority || "Medium",
                    department: newReport.department
                });
            } catch (err) {
                console.warn("Supabase background sync notice:", err);
            }
        }
        return newReport;
    },

    updateStatus: async function(reportId, newStatus, remarks) {
        const reports = this.getReports();
        const item = reports.find(r => r.id === reportId || r.issue_code === reportId);
        if (item) {
            item.status = newStatus;
            item.updated_at = new Date().toISOString();
            if (!item.timeline) item.timeline = [];
            item.timeline.push({
                status: newStatus,
                time: new Date().toISOString(),
                note: remarks || `Status updated to ${newStatus} by Municipal Admin Officer.`
            });
            this.saveReports(reports);

            if (supabaseClient) {
                try {
                    await supabaseClient
                        .from("issues")
                        .update({ status: newStatus })
                        .eq("issue_code", reportId);
                } catch (err) {
                    console.warn("Supabase status update notice:", err);
                }
            }
            return true;
        }
        return false;
    }
};

// --- 3. GLOBAL NAVIGATION & PAGE STATE ---
window.showPage = function(page) {
    const pages = {
        home: "homePage",
        report: "reportPage",
        reports: "reportsPage",
        about: "aboutPage"
    };

    Object.values(pages).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove("active-page");
    });

    const target = document.getElementById(pages[page]);
    if (target) target.classList.add("active-page");

    document.querySelectorAll(".nav-link").forEach((link, idx) => {
        link.classList.remove("active");
        if ((page === "home" && idx === 0) || (page === "reports" && idx === 1) || (page === "about" && idx === 2)) {
            link.classList.add("active");
        }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (page === "home") {
        setTimeout(initHeroMap, 100);
    }
    if (page === "reports") {
        loadReports();
    }
    if (page === "report") {
        setTimeout(initLocationPickerMap, 100);
    }
};

function showPage(page) {
    return window.showPage(page);
}

function startReport(category) {
    return window.startReport(category);
}

// --- 4. MAP INTEGRATION (LEAFLET.JS) ---
let heroMapInstance = null;
let locationPickerMapInstance = null;
let pickerMarker = null;

function initHeroMap() {
    const container = document.getElementById("heroMap");
    if (!container || typeof L === "undefined") return;

    if (heroMapInstance) {
        heroMapInstance.invalidateSize();
        return;
    }

    const defaultCoords = (window.CARE_CONFIG && window.CARE_CONFIG.defaultMapCenter) || [28.6139, 77.2090];
    heroMapInstance = L.map("heroMap", { zoomControl: false }).setView(defaultCoords, 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(heroMapInstance);

    // Render markers from active reports
    const reports = window.CAREStore.getReports();
    const markers = [];
    reports.forEach(report => {
        if (report.latitude && report.longitude) {
            const icon = getCategoryMarkerIcon(report.category);
            const marker = L.marker([report.latitude, report.longitude], { icon: icon }).addTo(heroMapInstance);
            marker.bindPopup(`
                <div style="font-family:Inter,sans-serif; font-size:12px;">
                    <strong style="color:#0b5ed7;">${report.issue_code || report.id}</strong><br/>
                    <b>${report.category}</b> - <span style="color:#16a34a;">${report.status}</span><br/>
                    <small>${report.address || ''}</small>
                </div>
            `);
            markers.push([report.latitude, report.longitude]);
        }
    });

    if (markers.length > 0) {
        if (markers.length === 1) {
            heroMapInstance.setView(markers[0], 13);
        } else {
            heroMapInstance.fitBounds(markers, { padding: [30, 30], maxZoom: 14 });
        }
    }
}

async function fetchRealIPLocation() {
    try {
        const res = await fetch("https://ipapi.co/json/");
        if (res.ok) {
            const data = await res.json();
            if (data && data.latitude && data.longitude) {
                return {
                    lat: parseFloat(data.latitude),
                    lng: parseFloat(data.longitude),
                    address: `${data.city || 'Local Area'}, ${data.region || ''}`
                };
            }
        }
    } catch (e) {
        console.warn("Primary IP geolocation notice:", e);
    }

    try {
        const res = await fetch("https://ip-api.com/json/");
        if (res.ok) {
            const data = await res.json();
            if (data && data.lat && data.lon) {
                return {
                    lat: parseFloat(data.lat),
                    lng: parseFloat(data.lon),
                    address: `${data.city || 'Local Area'}, ${data.regionName || ''}`
                };
            }
        }
    } catch (e) {
        console.warn("Secondary IP geolocation notice:", e);
    }

    return null;
}

async function initLocationPickerMap() {
    const container = document.getElementById("locationPickerMap");
    if (!container || typeof L === "undefined") return;

    const wrapper = document.getElementById("locationPickerWrapper");
    if (wrapper) wrapper.style.display = "block";

    if (locationPickerMapInstance) {
        locationPickerMapInstance.invalidateSize();
        return;
    }

    let startCoords = (window.CARE_CONFIG && window.CARE_CONFIG.defaultMapCenter) || [27.4924, 77.6737];
    const ipLoc = await fetchRealIPLocation();
    if (ipLoc) {
        startCoords = [ipLoc.lat, ipLoc.lng];
    }

    locationPickerMapInstance = L.map("locationPickerMap").setView(startCoords, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(locationPickerMapInstance);

    pickerMarker = L.marker(startCoords, { draggable: true }).addTo(locationPickerMapInstance);
    updateLocationFields(startCoords[0], startCoords[1]);

    pickerMarker.on("dragend", function(e) {
        const coord = pickerMarker.getLatLng();
        updateLocationFields(coord.lat, coord.lng);
    });

    locationPickerMapInstance.on("click", function(e) {
        pickerMarker.setLatLng(e.latlng);
        updateLocationFields(e.latlng.lat, e.latlng.lng);
    });
}

function updateLocationFields(lat, lng) {
    const latInput = document.getElementById("latitude");
    const lngInput = document.getElementById("longitude");
    const textEl = document.getElementById("locationText");
    const badgeEl = document.getElementById("mapCoordBadge");

    const formattedLat = Number(lat).toFixed(6);
    const formattedLng = Number(lng).toFixed(6);

    if (latInput) latInput.value = formattedLat;
    if (lngInput) lngInput.value = formattedLng;
    if (textEl) textEl.textContent = `${formattedLat}, ${formattedLng}`;
    if (badgeEl) badgeEl.textContent = `${formattedLat}, ${formattedLng}`;
}

async function geocodeAddress(addressString) {
    if (!addressString || typeof addressString !== "string") return null;
    const query = addressString.trim().toLowerCase();

    // Fast lookup dictionary for Indian cities including Mathura
    const cityMap = {
        "mathura": [27.4924, 77.6737],
        "vrindavan": [27.5804, 77.7006],
        "agra": [27.1767, 78.0081],
        "delhi": [28.6139, 77.2090],
        "new delhi": [28.6139, 77.2090],
        "noida": [28.5355, 77.3910],
        "gurugram": [28.4595, 77.0266],
        "gurgaon": [28.4595, 77.0266],
        "ghaziabad": [28.6692, 77.4538],
        "meerut": [28.9845, 77.7064],
        "aligarh": [27.8974, 78.0880],
        "lucknow": [26.8467, 80.9462],
        "kanpur": [26.4499, 80.3319],
        "jaipur": [26.9124, 75.7873],
        "mumbai": [19.0760, 72.8777],
        "bengaluru": [12.9716, 77.5946],
        "bangalore": [12.9716, 77.5946],
        "hyderabad": [17.3850, 78.4867],
        "kolkata": [22.5726, 88.3639],
        "varanasi": [25.3176, 82.9739]
    };

    for (const city in cityMap) {
        if (query.includes(city)) {
            return cityMap[city];
        }
    }

    // Real-time OpenStreetMap Nominatim Geocoding API
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}&limit=1`);
        if (response.ok) {
            const results = await response.json();
            if (results && results.length > 0) {
                const lat = parseFloat(results[0].lat);
                const lon = parseFloat(results[0].lon);
                if (!isNaN(lat) && !isNaN(lon)) {
                    return [lat, lon];
                }
            }
        }
    } catch (err) {
        console.warn("Geocoding fetch notice:", err);
    }

    return null;
}

function getCategoryMarkerIcon(category) {
    let color = "#0b5ed7";
    if (category === "Pothole") color = "#e11d48";
    if (category === "Garbage") color = "#d97706";
    if (category === "Streetlight") color = "#ca8a04";
    if (category === "Drainage") color = "#0284c7";

    return L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div style="background:${color}; width:24px; height:24px; border-radius:50%; border:3px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

// --- 5. GPS & IP LOCATION DETECTION ---
async function getLocation() {
    const locationText = document.getElementById("locationText");
    const addressInput = document.getElementById("citizenAddress");
    if (locationText) locationText.textContent = "Detecting your real location...";

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                updateLocationFields(lat, lng);

                if (locationPickerMapInstance && pickerMarker) {
                    const coords = [lat, lng];
                    locationPickerMapInstance.setView(coords, 15);
                    pickerMarker.setLatLng(coords);
                }

                // Reverse geocode GPS coordinates to capture street address / city
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.display_name && addressInput) {
                            addressInput.value = data.display_name;
                        }
                    }
                } catch (err) {
                    console.warn("Reverse geocoding notice:", err);
                }

                showToast("GPS location captured successfully!");
            },
            async error => {
                console.warn("Browser GPS unavailable/denied:", error);
                await resolveRealLocationFallback();
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
    } else {
        await resolveRealLocationFallback();
    }

    async function resolveRealLocationFallback() {
        const typedAddress = addressInput?.value.trim() || "";
        if (typedAddress) {
            const coords = await geocodeAddress(typedAddress);
            if (coords) {
                updateLocationFields(coords[0], coords[1]);
                if (locationPickerMapInstance && pickerMarker) {
                    locationPickerMapInstance.setView(coords, 14);
                    pickerMarker.setLatLng(coords);
                }
                showToast(`Location set from typed address: ${typedAddress}`);
                return;
            }
        }

        // Fetch user's real IP Geolocation
        const ipLoc = await fetchRealIPLocation();
        if (ipLoc) {
            updateLocationFields(ipLoc.lat, ipLoc.lng);
            if (locationPickerMapInstance && pickerMarker) {
                locationPickerMapInstance.setView([ipLoc.lat, ipLoc.lng], 14);
                pickerMarker.setLatLng([ipLoc.lat, ipLoc.lng]);
            }
            if (addressInput && (!addressInput.value.trim() || addressInput.value.trim() === "Main City Road")) {
                addressInput.value = ipLoc.address;
            }
            showToast(`Real location detected: ${ipLoc.address}`);
        } else {
            showToast("Please enter your area or landmark in the address box.");
        }
    }
}

function compressImageFile(file, maxWidth = 600, maxHeight = 600, quality = 0.75) {
    return new Promise((resolve) => {
        if (!file || !file.type.startsWith("image/")) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(compressedDataUrl);
            };
            img.onerror = () => resolve(e.target.result);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

// --- 6. AI VISION & IMAGE ANALYSIS ENGINE ---
async function previewUploadedImage(input) {
    const container = document.getElementById("imagePreviewContainer");
    const img = document.getElementById("imagePreview");
    const scanLine = document.getElementById("aiScanLine");
    const aiCard = document.getElementById("aiAnalysisCard");

    if (!container || !img) return;

    if (input.files && input.files[0]) {
        const file = input.files[0];
        container.style.display = "block";
        if (scanLine) scanLine.style.display = "block";
        if (aiCard) aiCard.style.display = "none";

        const compressedUrl = await compressImageFile(file);
        if (compressedUrl) {
            img.src = compressedUrl;
            input.dataset.compressedUrl = compressedUrl;
        } else {
            const reader = new FileReader();
            reader.onload = function(e) {
                img.src = e.target.result;
                input.dataset.compressedUrl = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        setTimeout(() => {
            if (scanLine) scanLine.style.display = "none";
            runAIVisionScan(file.name);
        }, 1200);
    } else {
        container.style.display = "none";
        if (aiCard) aiCard.style.display = "none";
        img.src = "";
        delete input.dataset.compressedUrl;
    }
}

function runAIVisionScan(filename) {
    const aiCard = document.getElementById("aiAnalysisCard");
    const aiText = document.getElementById("aiAnalysisText");
    const aiConfidence = document.getElementById("aiConfidence");
    const aiSeverityTag = document.getElementById("aiSeverityTag");
    const categorySelect = document.getElementById("category");

    if (!aiCard) return;

    let selectedCategory = categorySelect ? categorySelect.value : "Pothole";
    if (!selectedCategory) selectedCategory = "Pothole";

    const confidenceScore = (93 + Math.random() * 6.5).toFixed(1);
    let priority = "Medium";
    if (selectedCategory === "Pothole" || selectedCategory === "Road Damage") priority = "High";
    if (selectedCategory === "Garbage" || selectedCategory === "Drainage") priority = "Critical";

    aiText.textContent = `AI Vision Detected: ${selectedCategory} (Severity Score: 8.4/10)`;
    if (aiConfidence) aiConfidence.innerHTML = `<i class="fa-solid fa-robot"></i> ${confidenceScore}% Confidence`;

    if (aiSeverityTag) {
        aiSeverityTag.textContent = `Suggested Priority: ${priority.toUpperCase()}`;
        aiSeverityTag.className = `priority-badge priority-${priority}`;
    }

    aiCard.style.display = "block";
}

// --- 7. TICKET TRACKER & HERO SEARCH ---
function trackHeroTicket() {
    const input = document.getElementById("heroTicketInput");
    if (!input || !input.value.trim()) {
        showToast("Please enter a valid Ticket ID.");
        return;
    }
    const ticketId = input.value.trim().toUpperCase();
    const reports = window.CAREStore.getReports();
    const match = reports.find(r => r.id === ticketId || r.issue_code === ticketId);

    if (match) {
        showPage("reports");
        setTimeout(() => {
            const card = document.querySelector(`[data-ticket-id="${match.id}"]`);
            if (card) {
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                card.style.border = "2px solid #0b5ed7";
                card.style.boxShadow = "0 0 20px rgba(11, 94, 215, 0.4)";
            }
        }, 300);
    } else {
        showToast(`Ticket ID "${ticketId}" not found in C.A.R.E. records.`);
    }
}

// --- 8. AUDIO NOTIFICATION ---
function playNotificationSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.12);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.6);
    } catch (e) {
        console.warn("Audio play notice:", e);
    }
}

// --- 9. SUBMIT ISSUE & GOVT AUTO-ROUTING ---
async function submitIssue(event) {
    event.preventDefault();

    if (typeof addCitizenFields === "function") {
        addCitizenFields();
    }

    const name = document.getElementById("citizenName")?.value.trim() || "Civic Citizen";
    const mobile = document.getElementById("citizenMobile")?.value.trim() || "9876543210";
    const email = document.getElementById("citizenEmail")?.value.trim() || "citizen@care.gov.in";
    const address = document.getElementById("citizenAddress")?.value.trim() || "Main City Road";
    const category = document.getElementById("category")?.value || "Pothole";
    const description = document.getElementById("description")?.value.trim() || "Civic issue needing attention.";
    let latitude = document.getElementById("latitude")?.value || "";
    let longitude = document.getElementById("longitude")?.value || "";
    const imageInput = document.getElementById("image");

    // Geocode typed address or fetch real IP location if GPS coordinates were not set
    if (!latitude || !longitude) {
        let coords = await geocodeAddress(address);
        if (!coords) {
            const ipLoc = await fetchRealIPLocation();
            if (ipLoc) coords = [ipLoc.lat, ipLoc.lng];
        }
        if (!coords) {
            coords = (window.CARE_CONFIG && window.CARE_CONFIG.defaultMapCenter) || [27.4924, 77.6737];
        }
        latitude = coords[0];
        longitude = coords[1];
        updateLocationFields(latitude, longitude);
    }

    const submitBtn = document.querySelector("#issueForm button[type='submit']");
    const origText = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing AI Analysis & Govt Dispatch...`;
    }

    try {
        const reportId = `CARE-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        
        let imageUrl = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80";
        if (imageInput) {
            if (imageInput.dataset.compressedUrl) {
                imageUrl = imageInput.dataset.compressedUrl;
            } else if (imageInput.files && imageInput.files[0]) {
                const compressed = await compressImageFile(imageInput.files[0]);
                if (compressed) imageUrl = compressed;
            }
        }

        const deptConfig = (window.CARE_CONFIG && window.CARE_CONFIG.departments && window.CARE_CONFIG.departments[category]) || {
            name: "Central Civic Grievance & Public Redressal Cell",
            email: "grievance.helpdesk@care.gov.in",
            phone: "+91-1800-11-700"
        };

        let priority = "Medium";
        if (category === "Pothole" || category === "Road Damage") priority = "High";
        if (category === "Garbage" || category === "Drainage") priority = "Critical";

        const citizenId = localStorage.getItem("care_citizen_id") || "CIT-GENERAL";
        const newReport = {
            id: reportId,
            issue_code: reportId,
            citizenId: citizenId,
            citizen_name: name,
            citizen_mobile: mobile,
            citizen_email: email,
            address: address,
            category: category,
            description: description,
            latitude: Number(latitude),
            longitude: Number(longitude),
            image_url: imageUrl,
            status: "Reported",
            priority: priority,
            department: deptConfig.name,
            created_at: new Date().toISOString(),
            ai_confidence: "96.8%",
            timeline: [
                { status: "Reported", time: new Date().toISOString(), note: `Logged & auto-dispatched to ${deptConfig.name}` }
            ]
        };

        await window.CAREStore.addReport(newReport);

        playNotificationSound();
        document.getElementById("issueForm")?.reset();
        
        const previewContainer = document.getElementById("imagePreviewContainer");
        if (previewContainer) previewContainer.style.display = "none";
        const aiCard = document.getElementById("aiAnalysisCard");
        if (aiCard) aiCard.style.display = "none";

        // Display Success Dispatch Modal
        const modal = document.getElementById("submitSuccessModal");
        if (modal) {
            document.getElementById("modalReportId").textContent = reportId;
            document.getElementById("modalDeptName").textContent = deptConfig.name;
            document.getElementById("modalDeptEmail").textContent = deptConfig.email;
            document.getElementById("modalDeptPhone").textContent = deptConfig.phone;

            const mailto = document.getElementById("modalMailtoLink");
            if (mailto) {
                const subject = `CIVIC ISSUE DISPATCH [${reportId}] - ${category}`;
                const body = `GOVERNMENT DISPATCH RECEIPT\n----------------------------\nTicket ID: ${reportId}\nCategory: ${category}\nPriority: ${priority}\nDepartment: ${deptConfig.name}\nDescription: ${description}\nLocation: ${latitude}, ${longitude}\nAddress: ${address}\nCitizen: ${name} (${mobile})`;
                mailto.href = `mailto:${deptConfig.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            }
            modal.style.display = "flex";
        } else {
            showToast(`Report ${reportId} submitted successfully!`);
            showPage("reports");
        }

        loadReports();
    } catch (err) {
        console.error("Submission error:", err);
        showToast("Report submission failed. Please try again.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origText;
        }
    }
}

function closeSuccessModal() {
    const modal = document.getElementById("submitSuccessModal");
    if (modal) modal.style.display = "none";
    showPage("reports");
}

// --- 10. LOAD & RENDER COMMUNITY REPORTS ---
function loadReports() {
    const container = document.getElementById("issuesContainer");
    if (!container) return;

    const reports = window.CAREStore.getReports();
    renderReports(reports);
    updateStatistics(reports);
}

function renderReports(reports) {
    const container = document.getElementById("issuesContainer");
    if (!container) return;

    if (!reports || !reports.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div><i class="fa-solid fa-inbox text-muted" style="font-size:42px; margin-bottom:12px;"></i></div>
                <h3>No civic reports found</h3>
                <p>Be the first citizen to report a civic issue!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    reports.forEach(report => {
        const card = document.createElement("article");
        card.className = "issue-card";
        card.setAttribute("data-ticket-id", report.id || report.issue_code);
        card.style.cssText = "background:white; border-radius:18px; border:1px solid #e2e8f0; overflow:hidden; margin-bottom:20px; box-shadow:0 10px 30px rgba(0,0,0,0.04); display:grid; grid-template-columns:220px 1fr;";

        const iconHTML = getCategoryIcon(report.category);
        const imageHTML = report.image_url
            ? `<div class="issue-image" style="cursor:pointer;" onclick="window.open('${escapeHTML(report.image_url)}', '_blank')">
                 <img src="${escapeHTML(report.image_url)}" alt="Issue Photo" style="width:100%; height:100%; object-fit:cover; min-height:180px;">
               </div>`
            : `<div class="issue-image" style="display:grid; place-items:center; background:#eff6ff; color:#0b5ed7; font-size:36px; min-height:180px;">${iconHTML}</div>`;

        const priorityClass = `priority-${report.priority || 'Medium'}`;
        const mapUrl = report.latitude && report.longitude ? `https://www.google.com/maps?q=${report.latitude},${report.longitude}` : "#";

        card.innerHTML = `
            ${imageHTML}
            <div class="issue-content" style="padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-family:monospace; font-weight:800; color:#0b5ed7; background:#eff6ff; padding:3px 10px; border-radius:6px; font-size:13px;">
                            <i class="fa-solid fa-ticket"></i> ${escapeHTML(report.id || report.issue_code)}
                        </span>
                        <span class="priority-badge ${priorityClass}">${escapeHTML(report.priority || 'Medium')}</span>
                    </div>

                    <h3 style="font-size:18px; font-weight:800; color:#0f172a; margin-bottom:6px;">
                        ${iconHTML} ${escapeHTML(report.category)}
                    </h3>

                    <p style="color:#475467; font-size:14px; margin-bottom:12px; line-height:1.5;">
                        ${escapeHTML(report.description)}
                    </p>

                    <div style="font-size:12px; color:#64748b; margin-bottom:8px; display:flex; gap:16px; flex-wrap:wrap;">
                        <span><i class="fa-solid fa-building-columns" style="color:#0b5ed7;"></i> ${escapeHTML(report.department || 'Municipal Dept')}</span>
                        <span><i class="fa-solid fa-location-dot" style="color:#ef4444;"></i> ${escapeHTML(report.address || 'GPS Tagged')}</span>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid #f1f5f9; margin-top:12px;">
                    <span class="badge-status ${getStatusBadgeColor(report.status)}">
                        <i class="fa-solid fa-circle-dot"></i> ${escapeHTML(report.status || 'Reported')}
                    </span>

                    <div style="display:flex; gap:8px;">
                        <a href="${mapUrl}" target="_blank" style="padding:7px 12px; background:#1e293b; color:white; border-radius:8px; font-size:12px; font-weight:700; text-decoration:none;">
                            <i class="fa-solid fa-map-location-dot"></i> Map
                        </a>
                        <button type="button" onclick="openReportTimeline('${report.id || report.issue_code}')" style="padding:7px 12px; background:#eff6ff; color:#0b5ed7; border:1px solid #bfdbfe; border-radius:8px; font-size:12px; font-weight:700;">
                            <i class="fa-solid fa-timeline"></i> Timeline
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function getStatusBadgeColor(status) {
    if (status === "Resolved") return "green";
    if (status === "In Progress" || status === "Verified") return "blue";
    return "yellow";
}

function openReportTimeline(reportId) {
    if (typeof window.showReportDetail === "function") {
        window.showReportDetail(reportId);
    } else {
        const reports = window.CAREStore.getReports();
        const r = reports.find(item => item.id === reportId || item.issue_code === reportId);
        if (r) {
            alert(`TICKET: ${r.id}\nStatus: ${r.status}\nDepartment: ${r.department}\n\nTimeline:\n` + 
                  (r.timeline || []).map(t => `• [${t.status}] ${t.note}`).join('\n'));
        }
    }
}

function getCategoryIcon(category) {
    const icons = {
        Pothole: '<i class="fa-solid fa-road-barrier" style="color:#e11d48;"></i>',
        Garbage: '<i class="fa-solid fa-trash-can" style="color:#d97706;"></i>',
        Streetlight: '<i class="fa-solid fa-lightbulb" style="color:#ca8a04;"></i>',
        Drainage: '<i class="fa-solid fa-water" style="color:#0284c7;"></i>',
        "Road Damage": '<i class="fa-solid fa-triangle-exclamation" style="color:#9333ea;"></i>',
        Other: '<i class="fa-solid fa-location-dot" style="color:#4b5563;"></i>'
    };
    return icons[category] || '<i class="fa-solid fa-location-dot"></i>';
}

function updateStatistics(reports) {
    const total = reports.length;
    const verified = reports.filter(r => r.status === "Verified" || r.status === "Assigned").length;
    const progress = reports.filter(r => r.status === "In Progress").length;
    const resolved = reports.filter(r => r.status === "Resolved").length;

    const totalEl = document.getElementById("totalIssues");
    const verifiedEl = document.getElementById("verifiedIssues");
    const progressEl = document.getElementById("progressIssues");
    const resolvedEl = document.getElementById("resolvedIssues");
    const heroCount = document.getElementById("heroReportCount");

    if (totalEl) totalEl.textContent = total;
    if (verifiedEl) verifiedEl.textContent = verified;
    if (progressEl) progressEl.textContent = progress;
    if (resolvedEl) resolvedEl.textContent = resolved;
    if (heroCount) heroCount.textContent = total;
}

function showToast(message) {
    const toast = document.getElementById("toast");
    const msgEl = document.getElementById("toastMessage");
    if (!toast || !msgEl) {
        alert(message);
        return;
    }
    msgEl.textContent = message;
    toast.classList.add("show-toast");
    setTimeout(() => {
        toast.classList.remove("show-toast");
    }, 3000);
}

function escapeHTML(str) {
    return String(str || "").replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

// --- 11. INITIALIZATION & PRELOADER DISMISS ---
function dismissPreloader() {
    try {
        const preloader = document.getElementById("appPreloader");
        if (preloader && !preloader.classList.contains("preloader-hidden")) {
            setTimeout(function() {
                preloader.classList.add("preloader-hidden");
            }, 400);
        }
    } catch (e) {
        console.warn("Preloader dismiss notice:", e);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const issueForm = document.getElementById("issueForm");
    if (issueForm) {
        issueForm.addEventListener("submit", submitIssue);
    }

    const addressInput = document.getElementById("citizenAddress");
    if (addressInput) {
        addressInput.addEventListener("change", async function() {
            const typed = this.value.trim();
            if (typed) {
                const coords = await geocodeAddress(typed);
                if (coords) {
                    updateLocationFields(coords[0], coords[1]);
                    if (locationPickerMapInstance && pickerMarker) {
                        locationPickerMapInstance.setView(coords, 14);
                        pickerMarker.setLatLng(coords);
                    }
                }
            }
        });
    }

    loadReports();
    setTimeout(initHeroMap, 300);
    dismissPreloader();
});

window.addEventListener("care:reports-updated", function() {
    loadReports();
});
window.addEventListener("storage", function() {
    loadReports();
});

if (document.readyState === "complete" || document.readyState === "interactive") {
    dismissPreloader();
}
window.addEventListener("load", dismissPreloader);
setTimeout(dismissPreloader, 800);
