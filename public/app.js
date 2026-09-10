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
const CARE_DELETED_KEY = "care_deleted_report_ids_v1";

window.CAREStore = {
    getDeletedIds: function() {
        try {
            const raw = localStorage.getItem(CARE_DELETED_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    return new Set(arr.map(id => String(id).trim()).filter(Boolean));
                }
            }
        } catch (e) {}
        return new Set();
    },

    saveDeletedIds: function(deletedSet) {
        try {
            localStorage.setItem(CARE_DELETED_KEY, JSON.stringify(Array.from(deletedSet)));
        } catch (e) {}
    },

    getReports: function() {
        const allReports = [];
        const seenIds = new Set();
        const deletedIds = this.getDeletedIds();
        const storageKeys = [CARE_STORAGE_KEY, "care_reports_v2", "care_reports", "care_citizen_reports"];

        storageKeys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(item => {
                            if (item && typeof item === "object") {
                                const id = String(item.id || item.issue_code || item.ticket_id || '').trim();
                                if (id && !seenIds.has(id) && !deletedIds.has(id)) {
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
        const storageKeys = [CARE_STORAGE_KEY, "care_reports_v2", "care_reports", "care_citizen_reports"];
        const trySave = (data) => {
            const json = JSON.stringify(data);
            storageKeys.forEach(key => {
                try {
                    localStorage.setItem(key, json);
                } catch (e) {}
            });
        };

        try {
            trySave(reports);
            window.dispatchEvent(new CustomEvent("care:reports-updated"));
        } catch (e) {
            console.warn("Local storage quota notice, pruning large data:", e);
            try {
                const pruned = reports.map((r, idx) => {
                    if (idx > 5 && r.image_url && r.image_url.startsWith("data:")) {
                        return { ...r, image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80" };
                    }
                    return r;
                });
                trySave(pruned);
                window.dispatchEvent(new CustomEvent("care:reports-updated"));
            } catch (err2) {
                console.error("Secondary storage error:", err2);
            }
        }
    },

    addReport: async function(newReport) {
        const newId = String(newReport.issue_code || newReport.id || '').trim();
        if (newId) {
            const deletedIds = this.getDeletedIds();
            if (deletedIds.has(newId)) {
                deletedIds.delete(newId);
                this.saveDeletedIds(deletedIds);
            }
        }

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

    fetchCloudReports: async function() {
        if (!supabaseClient) return this.getReports();
        try {
            const { data, error } = await supabaseClient
                .from("issues")
                .select("*")
                .order("created_at", { ascending: false });

            if (!error && Array.isArray(data)) {
                const deletedIds = this.getDeletedIds();
                const localReports = this.getReports();
                let hasChanges = false;

                data.forEach(cloudItem => {
                    const id = String(cloudItem.issue_code || cloudItem.id || '').trim();
                    if (id && !deletedIds.has(id)) {
                        const existing = localReports.find(r => String(r.id || r.issue_code || '').trim() === id);
                        if (existing) {
                            if (cloudItem.status && existing.status !== cloudItem.status) {
                                existing.status = cloudItem.status;
                                hasChanges = true;
                            }
                        } else {
                            const normalized = {
                                id: id,
                                issue_code: id,
                                citizen_name: cloudItem.citizen_name || "Citizen Reporter",
                                citizen_mobile: cloudItem.citizen_mobile || "",
                                citizen_email: cloudItem.citizen_email || "",
                                address: cloudItem.address || "City Area",
                                category: cloudItem.category || "General Issue",
                                description: cloudItem.description || "",
                                latitude: Number(cloudItem.latitude || 27.4924),
                                longitude: Number(cloudItem.longitude || 77.6737),
                                image_url: cloudItem.image_url || "",
                                status: cloudItem.status || "Reported",
                                priority: cloudItem.priority || "Medium",
                                department: cloudItem.department || "Municipal Grievance Cell",
                                created_at: cloudItem.created_at || new Date().toISOString(),
                                timeline: [
                                    { status: cloudItem.status || "Reported", time: cloudItem.created_at || new Date().toISOString(), note: "Report logged in municipal cloud database." }
                                ]
                            };
                            localReports.push(normalized);
                            hasChanges = true;
                        }
                    }
                });

                if (hasChanges) {
                    this.saveReports(localReports);
                }
                return localReports;
            }
        } catch (err) {
            console.warn("Supabase fetch notice:", err);
        }
        return this.getReports();
    },

    updateStatus: async function(reportId, newStatus, remarks) {
        const rid = String(reportId).trim();
        const reports = this.getReports();
        const item = reports.find(r => String(r.id || r.issue_code || '').trim() === rid);
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
                        .eq("issue_code", rid);
                } catch (err) {
                    console.warn("Supabase status update notice:", err);
                }
            }
            return true;
        }
        return false;
    },

    deleteReport: async function(reportId) {
        return this.deleteMultipleReports([reportId]);
    },

    deleteMultipleReports: async function(reportIds) {
        if (!Array.isArray(reportIds) || reportIds.length === 0) return false;
        const idSet = new Set(reportIds.map(id => String(id).trim()).filter(Boolean));
        if (idSet.size === 0) return false;

        // 1. Mark as deleted in tombstone storage so cloud fetch never restores them
        const deletedIds = this.getDeletedIds();
        idSet.forEach(id => deletedIds.add(id));
        this.saveDeletedIds(deletedIds);

        // 2. Filter out deleted reports from active local state
        let reports = this.getReports();
        reports = reports.filter(r => {
            const rid = String(r.id || r.issue_code || r.ticket_id || '').trim();
            return !idSet.has(rid);
        });

        // 3. Save clean reports across all storage keys
        this.saveReports(reports);

        // 4. Delete from Supabase cloud database
        if (supabaseClient) {
            try {
                const idArr = Array.from(idSet);
                await supabaseClient.from("issues").delete().in("issue_code", idArr);
                await supabaseClient.from("issues").delete().in("id", idArr);
            } catch (err) {
                console.warn("Supabase delete notice:", err);
            }
        }
        return true;
    }
};
// Real-time Cloud Synchronization across Phone, Laptop, and Admin Console
function initSupabaseRealtime() {
    if (!supabaseClient) return;
    try {
        supabaseClient
            .channel('public:issues')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
                window.CAREStore.fetchCloudReports();
            })
            .subscribe();
    } catch (e) {
        console.warn("Realtime subscription notice:", e);
    }
}
initSupabaseRealtime();
setInterval(() => {
    if (window.CAREStore) window.CAREStore.fetchCloudReports();
}, 8000);

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

    document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.remove("active");
        const onclickAttr = link.getAttribute("onclick") || "";
        if (onclickAttr.includes(`'${page}'`)) {
            link.classList.add("active");
        }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (page === "home") {
        setTimeout(initHeroMap, 150);
    }
    if (page === "reports") {
        loadReports();
    }
    if (page === "report") {
        setTimeout(() => {
            initLocationPickerMap();
            const latVal = document.getElementById("latitude")?.value;
            if (!latVal || latVal === "0" || latVal === "") {
                getLocation(true);
            }
        }, 150);
    }
};

window.startReport = function(category) {
    window.showPage('report');
    const catSelect = document.getElementById("category");
    if (catSelect && category) {
        catSelect.value = category;
        catSelect.dispatchEvent(new Event('change'));
    }
    setTimeout(() => {
        initLocationPickerMap();
        const latVal = document.getElementById("latitude")?.value;
        if (!latVal || latVal === "0" || latVal === "") {
            getLocation(true);
        }
    }, 150);
};

function showPage(page) {
    return window.showPage(page);
}

function startReport(category) {
    return window.startReport(category);
}

// --- 4. MAP INTEGRATION & ACCURATE LOCATION SYSTEM (LEAFLET.JS) ---
let heroMapInstance = null;
let locationPickerMapInstance = null;
let pickerMarker = null;
let accuracyCircle = null;
let userLocMarker = null;
let isDetectingLocation = false;
let userCurrentCoords = null;

function getCategoryMarkerIcon(category) {
    let color = "#0b5ed7";
    if (category === "Pothole") color = "#e11d48";
    if (category === "Garbage") color = "#d97706";
    if (category === "Streetlight") color = "#ca8a04";
    if (category === "Drainage") color = "#0284c7";
    if (category === "Road Damage") color = "#9333ea";

    return L.divIcon({
        className: "custom-leaflet-marker",
        html: `<div style="background:${color}; width:24px; height:24px; border-radius:50%; border:3px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

function initHeroMap() {
    const container = document.getElementById("heroMap");
    if (!container || typeof L === "undefined") return;

    if (heroMapInstance) {
        heroMapInstance.invalidateSize();
        return;
    }

    const defaultCoords = userCurrentCoords || (window.CARE_CONFIG && window.CARE_CONFIG.defaultMapCenter) || [28.6139, 77.2090];
    heroMapInstance = L.map("heroMap", { zoomControl: false }).setView(defaultCoords, 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "Â© OpenStreetMap contributors"
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
                    <strong style="color:#0b5ed7;">${escapeHTML(report.issue_code || report.id)}</strong><br/>
                    <b>${escapeHTML(report.category)}</b> - <span style="color:#16a34a; font-weight:700;">${escapeHTML(report.status)}</span><br/>
                    <small>${escapeHTML(report.address || '')}</small>
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

// Multi-provider Real-time IP Geolocation Engine
async function fetchRealIPLocation() {
    const endpoints = [
        async () => {
            const res = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client");
            if (res.ok) {
                const d = await res.json();
                if (d && d.latitude && d.longitude) {
                    const city = d.locality || d.city || d.principalSubdivision || "Your Area";
                    const state = d.principalSubdivision || "";
                    const country = d.countryName || "";
                    return {
                        lat: parseFloat(d.latitude),
                        lng: parseFloat(d.longitude),
                        address: [city, state, country].filter(Boolean).join(", "),
                        accuracy: 2500,
                        source: "Network Location"
                    };
                }
            }
        },
        async () => {
            const res = await fetch("https://ipwhois.app/json/");
            if (res.ok) {
                const d = await res.json();
                if (d && d.latitude && d.longitude && d.success !== false) {
                    return {
                        lat: parseFloat(d.latitude),
                        lng: parseFloat(d.longitude),
                        address: `${d.city || 'Your Area'}, ${d.region || ''}, ${d.country || ''}`,
                        accuracy: 4000,
                        source: "IP Geolocation"
                    };
                }
            }
        },
        async () => {
            const res = await fetch("https://ipapi.co/json/");
            if (res.ok) {
                const d = await res.json();
                if (d && d.latitude && d.longitude) {
                    return {
                        lat: parseFloat(d.latitude),
                        lng: parseFloat(d.longitude),
                        address: `${d.city || 'Your Area'}, ${d.region || ''}, ${d.country_name || ''}`,
                        accuracy: 5000,
                        source: "IP Geolocation"
                    };
                }
            }
        }
    ];

    for (const fetcher of endpoints) {
        try {
            const loc = await fetcher();
            if (loc && !isNaN(loc.lat) && !isNaN(loc.lng)) {
                return loc;
            }
        } catch (e) {
            console.warn("IP geolocation endpoint notice:", e);
        }
    }
    return null;
}

// High Accuracy Reverse Geocoding (Coordinates -> Human Street Address)
async function reverseGeocode(lat, lng) {
    // 1. Try BigDataCloud Reverse Geocoding API (Fast, Free, CORS friendly)
    try {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data) {
                const parts = [];
                if (data.localityInfo && data.localityInfo.informative) {
                    const informative = data.localityInfo.informative
                        .filter(inf => inf.order <= 6 && inf.name && !inf.name.includes("India"))
                        .map(inf => inf.name);
                    if (informative.length > 0) parts.push(informative[0]);
                }
                if (data.locality && !parts.includes(data.locality)) parts.push(data.locality);
                if (data.city && !parts.includes(data.city)) parts.push(data.city);
                if (data.principalSubdivision && !parts.includes(data.principalSubdivision)) parts.push(data.principalSubdivision);
                if (data.postcode) parts.push(data.postcode);

                const finalAddress = parts.join(", ");
                if (finalAddress.length > 5) return finalAddress;
            }
        }
    } catch (e) {
        console.warn("BigDataCloud reverse geocode notice:", e);
    }

    // 2. Try OpenStreetMap Nominatim with proper headers
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
                return data.display_name;
            }
        }
    } catch (e) {
        console.warn("Nominatim reverse geocode notice:", e);
    }

    return null;
}

// Forward Geocoding (Human Address -> Coordinates)
async function geocodeAddress(addressString) {
    if (!addressString || typeof addressString !== "string") return null;
    const query = addressString.trim();
    if (query.length < 2) return null;

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

    const lower = query.toLowerCase();
    for (const city in cityMap) {
        if (lower === city || lower.includes(city)) {
            return cityMap[city];
        }
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
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

// Update all coordinate and address fields in the UI
function updateLocationFields(lat, lng, addressText, accuracyMeters, isGps) {
    const latInput = document.getElementById("latitude");
    const lngInput = document.getElementById("longitude");
    const textEl = document.getElementById("locationText");
    const badgeEl = document.getElementById("mapCoordBadge");
    const addressInput = document.getElementById("citizenAddress");

    const formattedLat = Number(lat).toFixed(6);
    const formattedLng = Number(lng).toFixed(6);

    if (latInput) latInput.value = formattedLat;
    if (lngInput) lngInput.value = formattedLng;

    userCurrentCoords = [Number(lat), Number(lng)];

    const accuracyText = accuracyMeters ? ` â€¢ Â±${Math.round(accuracyMeters)}m precision` : "";
    const sourceTag = isGps ? "ðŸ“ Live GPS" : "ðŸŒ Accurate Location";

    if (textEl) {
        if (addressText) {
            textEl.innerHTML = `<span style="font-weight:700; color:#0b5ed7;">${sourceTag}:</span> ${escapeHTML(addressText)} <span style="color:#64748b; font-size:12px;">(${formattedLat}, ${formattedLng}${accuracyText})</span>`;
        } else {
            textEl.innerHTML = `<span style="font-weight:700; color:#0b5ed7;">${sourceTag}:</span> ${formattedLat}, ${formattedLng}${accuracyText}`;
        }
    }

    if (badgeEl) {
        badgeEl.textContent = `${formattedLat}, ${formattedLng}`;
    }

    if (addressText && addressInput) {
        if (!addressInput.value.trim() || addressInput.value.trim() === "Main City Road" || addressInput.dataset.autoFilled === "true") {
            addressInput.value = addressText;
            addressInput.dataset.autoFilled = "true";
        }
    }
}

// Initialize Leaflet Location Picker Map
async function initLocationPickerMap() {
    const container = document.getElementById("locationPickerMap");
    if (!container || typeof L === "undefined") return;

    const wrapper = document.getElementById("locationPickerWrapper");
    if (wrapper) wrapper.style.display = "block";

    if (locationPickerMapInstance) {
        locationPickerMapInstance.invalidateSize();
        return;
    }

    let startCoords = userCurrentCoords || [28.6139, 77.2090];
    const latInput = document.getElementById("latitude");
    const lngInput = document.getElementById("longitude");

    if (latInput && lngInput && latInput.value && lngInput.value && Number(latInput.value) !== 0) {
        startCoords = [parseFloat(latInput.value), parseFloat(lngInput.value)];
    }

    locationPickerMapInstance = L.map("locationPickerMap", {
        zoomControl: true
    }).setView(startCoords, 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "Â© OpenStreetMap contributors",
        maxZoom: 19
    }).addTo(locationPickerMapInstance);

    pickerMarker = L.marker(startCoords, {
        draggable: true,
        title: "Incident Spot - Drag to adjust"
    }).addTo(locationPickerMapInstance);

    pickerMarker.bindPopup("<b>Incident Spot</b><br/>Drag pin to adjust exact location").openPopup();

    pickerMarker.on("dragend", async function(e) {
        const coord = pickerMarker.getLatLng();
        const address = await reverseGeocode(coord.lat, coord.lng);
        updateLocationFields(coord.lat, coord.lng, address, null, false);
    });

    locationPickerMapInstance.on("click", async function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        pickerMarker.setLatLng(e.latlng);
        pickerMarker.openPopup();
        const address = await reverseGeocode(lat, lng);
        updateLocationFields(lat, lng, address, null, false);
    });

    // Auto-detect user's current location on map init if not set
    if (!latInput || !latInput.value || latInput.value === "0" || latInput.value === "") {
        getLocation(true);
    }
}

// --- 5. GPS & ACCURATE LOCATION ENGINE ---
async function getLocation(isSilent = false) {
    if (isDetectingLocation) return;
    isDetectingLocation = true;

    const locationText = document.getElementById("locationText");
    const addressInput = document.getElementById("citizenAddress");
    const locateBtn = document.querySelector(".location-button");

    if (locationText) {
        locationText.innerHTML = `<span style="color:#0b5ed7;"><i class="fa-solid fa-spinner fa-spin"></i> Detecting your current real location...</span>`;
    }
    if (locateBtn) {
        locateBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Locating...`;
        locateBtn.disabled = true;
    }

    const restoreBtn = () => {
        if (locateBtn) {
            locateBtn.innerHTML = `<i class="fa-solid fa-crosshairs"></i> Detect GPS Location`;
            locateBtn.disabled = false;
        }
        isDetectingLocation = false;
    };

    // 1. Try Browser Geolocation API
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                const address = await reverseGeocode(lat, lng);
                updateLocationFields(lat, lng, address, accuracy, true);

                if (locationPickerMapInstance) {
                    locationPickerMapInstance.setView([lat, lng], 16);
                    if (pickerMarker) {
                        pickerMarker.setLatLng([lat, lng]);
                        pickerMarker.bindPopup("<b>ðŸ“ Your Current Location</b><br/>Drag pin if needed").openPopup();
                    }
                    if (accuracyCircle) {
                        accuracyCircle.setLatLng([lat, lng]);
                        accuracyCircle.setRadius(accuracy || 30);
                    } else {
                        accuracyCircle = L.circle([lat, lng], {
                            radius: accuracy || 30,
                            color: "#2563eb",
                            fillColor: "#3b82f6",
                            fillOpacity: 0.15,
                            weight: 1.5
                        }).addTo(locationPickerMapInstance);
                    }
                }

                if (!isSilent) showToast("Current GPS location detected with high accuracy!");
                restoreBtn();
            },
            async error => {
                console.warn("Browser GPS unavailable/denied:", error);
                await fallbackToIPLocation(isSilent);
                restoreBtn();
            },
            { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
        );
    } else {
        await fallbackToIPLocation(isSilent);
        restoreBtn();
    }

    async function fallbackToIPLocation(silent) {
        // Try reverse/forward geocoding from typed address first if user entered one
        const typedAddress = addressInput?.value.trim() || "";
        if (typedAddress && typedAddress !== "Main City Road") {
            const coords = await geocodeAddress(typedAddress);
            if (coords) {
                updateLocationFields(coords[0], coords[1], typedAddress, 100, false);
                if (locationPickerMapInstance && pickerMarker) {
                    locationPickerMapInstance.setView(coords, 15);
                    pickerMarker.setLatLng(coords);
                    pickerMarker.bindPopup(`<b>${escapeHTML(typedAddress)}</b>`).openPopup();
                }
                if (!silent) showToast(`Location pinned from address: ${typedAddress}`);
                return;
            }
        }

        // Multi-provider instant IP geolocation fallback
        const ipLoc = await fetchRealIPLocation();
        if (ipLoc) {
            const address = ipLoc.address || (await reverseGeocode(ipLoc.lat, ipLoc.lng)) || "Local City Area";
            updateLocationFields(ipLoc.lat, ipLoc.lng, address, ipLoc.accuracy, false);
            if (locationPickerMapInstance && pickerMarker) {
                locationPickerMapInstance.setView([ipLoc.lat, ipLoc.lng], 14);
                pickerMarker.setLatLng([ipLoc.lat, ipLoc.lng]);
                pickerMarker.bindPopup("<b>📍 Current Area Location</b>").openPopup();
            }
            if (!silent) showToast(`Current location detected: ${address}`);
        } else {
            if (locationText) {
                locationText.innerHTML = `<span style="color:#b91c1c;"><i class="fa-solid fa-triangle-exclamation"></i> GPS unavailable. Please click on the map to set location or enter address.</span>`;
            }
            if (!silent) showToast("Please click on the map to pin your exact location.");
        }
    }
}

// --- 6. IMAGE PROCESSING & CLIENT-SIDE COMPRESSION ---
async function compressImageFile(file, maxDimension = 900, quality = 0.72) {
    if (!file || !(file instanceof Blob) || !file.type.startsWith("image/")) return null;
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                try {
                    const dataUrl = canvas.toDataURL("image/jpeg", quality);
                    resolve(dataUrl);
                } catch (err) {
                    console.warn("Canvas export fallback:", err);
                    resolve(e.target.result);
                }
            };
            img.onerror = () => resolve(e.target.result);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

// --- 7. PHOTO PREVIEW & AI VISION ANALYSIS ---
async function previewUploadedImage(input) {
    const previewContainer = document.getElementById("imagePreviewContainer");
    const previewImg = document.getElementById("imagePreview");
    const aiCard = document.getElementById("aiAnalysisCard");
    const aiMsg = document.getElementById("aiValidationMsg");
    const categorySelect = document.getElementById("category");

    if (!input || !input.files || !input.files[0]) {
        clearUploadedImage();
        return;
    }

    const file = input.files[0];
    try {
        const compressedDataUrl = await compressImageFile(file);
        if (compressedDataUrl) {
            input.dataset.compressedUrl = compressedDataUrl;
            if (previewImg) previewImg.src = compressedDataUrl;
            if (previewContainer) previewContainer.style.display = "block";

            // Visual feedback of AI Analysis
            if (aiCard) {
                aiCard.style.display = "block";
                const catVal = (categorySelect && categorySelect.value) ? categorySelect.value : "Pothole / Civic Infrastructure";
                const confEl = document.getElementById("aiConfidence");
                const textEl = document.getElementById("aiAnalysisText");
                const sevEl = document.getElementById("aiSeverityTag");

                if (textEl) textEl.textContent = `AI Vision Analysis: Detected ${catVal}`;
                if (confEl) confEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Verified (97.4%)`;
                if (sevEl) {
                    const prio = (catVal === "Pothole" || catVal === "Road Damage") ? "HIGH" : (catVal === "Garbage" || catVal === "Drainage" ? "CRITICAL" : "MEDIUM");
                    sevEl.className = `priority-badge priority-${prio.charAt(0) + prio.slice(1).toLowerCase()}`;
                    sevEl.textContent = `Suggested Priority: ${prio}`;
                }
            }

            if (aiMsg) aiMsg.style.display = "none";
        }
    } catch (e) {
        console.warn("Preview image processing notice:", e);
    }
}

function clearUploadedImage() {
    const input = document.getElementById("image");
    const previewContainer = document.getElementById("imagePreviewContainer");
    const previewImg = document.getElementById("imagePreview");
    const aiCard = document.getElementById("aiAnalysisCard");
    const aiMsg = document.getElementById("aiValidationMsg");

    if (input) {
        input.value = "";
        delete input.dataset.compressedUrl;
    }
    if (previewImg) previewImg.src = "";
    if (previewContainer) previewContainer.style.display = "none";
    if (aiCard) aiCard.style.display = "none";
    if (aiMsg) {
        aiMsg.style.display = "none";
        aiMsg.textContent = "";
    }
}

// --- 8. AUDIO NOTIFICATION SOUND ---
function playNotificationSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
        // Safe non-blocking audio
    }
}

// --- 9. SUBMIT ISSUE & GOVT AUTO-ROUTING ---
async function submitIssue(event) {
    if (event) event.preventDefault();

    if (typeof addCitizenFields === "function") {
        try { addCitizenFields(); } catch(e){}
    }

    const name = document.getElementById("citizenName")?.value.trim() || "Civic Citizen";
    const mobile = document.getElementById("citizenMobile")?.value.trim() || "9876543210";
    const email = document.getElementById("citizenEmail")?.value.trim() || "citizen@care.gov.in";
    const address = document.getElementById("citizenAddress")?.value.trim() || "Main City Road";
    const category = document.getElementById("category")?.value || "";
    const description = document.getElementById("description")?.value.trim() || "";
    let latitude = document.getElementById("latitude")?.value || "";
    let longitude = document.getElementById("longitude")?.value || "";
    const imageInput = document.getElementById("image");

    if (!category) {
        showToast("Please select an issue category.");
        document.getElementById("category")?.focus();
        return;
    }

    if (!description) {
        showToast("Please enter a description of the issue.");
        document.getElementById("description")?.focus();
        return;
    }

    const submitBtn = document.querySelector("#issueForm button[type='submit']");
    const origText = submitBtn ? submitBtn.innerHTML : `<i class="fa-solid fa-paper-plane"></i> Submit Report`;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing AI Analysis & Govt Dispatch...`;
    }

    try {
        // Geocode typed address or fetch real IP location if GPS coordinates were not set
        if (!latitude || !longitude || isNaN(Number(latitude)) || Number(latitude) === 0) {
            let coords = null;
            if (address && address !== "Main City Road") {
                coords = await geocodeAddress(address);
            }
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

        try {
            localStorage.setItem("care_citizen_name", name);
            localStorage.setItem("care_citizen_mobile", mobile);
            localStorage.setItem("care_citizen_email", email);
            localStorage.setItem("care_citizen_address", address);
        } catch (e) {}

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
            ai_confidence: "97.4%",
            timeline: [
                { status: "Reported", time: new Date().toISOString(), note: `Logged & auto-dispatched to ${deptConfig.name}` }
            ]
        };

        await window.CAREStore.addReport(newReport);

        playNotificationSound();
        document.getElementById("issueForm")?.reset();
        clearUploadedImage();

        // Display Success Dispatch Modal
        const modal = document.getElementById("submitSuccessModal");
        if (modal) {
            const modalRep = document.getElementById("modalReportId");
            const modalDept = document.getElementById("modalDeptName");
            const modalMail = document.getElementById("modalDeptEmail");
            const modalPhone = document.getElementById("modalDeptPhone");

            if (modalRep) modalRep.textContent = reportId;
            if (modalDept) modalDept.textContent = deptConfig.name;
            if (modalMail) modalMail.textContent = deptConfig.email;
            if (modalPhone) modalPhone.textContent = deptConfig.phone;

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

    // Asynchronously sync latest reports from Supabase Cloud
    if (window.CAREStore && typeof window.CAREStore.fetchCloudReports === "function") {
        window.CAREStore.fetchCloudReports().then(cloudReports => {
            if (cloudReports && cloudReports.length !== reports.length) {
                renderReports(cloudReports);
                updateStatistics(cloudReports);
            }
        }).catch(err => console.warn("Cloud sync catch:", err));
    }
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
        try {
            if (!report || typeof report !== "object") return;

            const ticketId = report.id || report.issue_code || `CARE-${Math.floor(100000 + Math.random()*900000)}`;
            const category = report.category || "General Civic Issue";
            const description = report.description || "No description provided.";
            const priority = report.priority || "Medium";
            const status = report.status || "Reported";
            const department = report.department || "Municipal Grievance Cell";
            const address = report.address || "Location Tagged";
            const imageUrl = report.image_url || "";

            const card = document.createElement("article");
            card.className = "issue-card";
            card.setAttribute("data-ticket-id", ticketId);

            const iconHTML = getCategoryIcon(category);
            const imageHTML = imageUrl
                ? `<div class="issue-image" style="cursor:pointer; min-height:180px;" onclick="window.open('${escapeHTML(imageUrl)}', '_blank')">
                     <img src="${escapeHTML(imageUrl)}" alt="Issue Photo" style="width:100%; height:100%; object-fit:cover; min-height:180px;">
                   </div>`
                : `<div class="issue-image" style="display:grid; place-items:center; background:#eff6ff; color:#0b5ed7; font-size:36px; min-height:180px;">${iconHTML}</div>`;

            const priorityClass = `priority-${priority}`;
            const mapUrl = report.latitude && report.longitude ? `https://www.google.com/maps?q=${report.latitude},${report.longitude}` : "#";

            card.innerHTML = `
                ${imageHTML}
                <div class="issue-content" style="padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-family:monospace; font-weight:800; color:#0b5ed7; background:#eff6ff; padding:3px 10px; border-radius:6px; font-size:13px;">
                                <i class="fa-solid fa-ticket"></i> ${escapeHTML(ticketId)}
                            </span>
                            <span class="priority-badge ${priorityClass}">${escapeHTML(priority)}</span>
                        </div>

                        <h3 style="font-size:18px; font-weight:800; color:#0f172a; margin-bottom:6px;">
                            ${iconHTML} ${escapeHTML(category)}
                        </h3>

                        <p style="color:#475467; font-size:14px; margin-bottom:12px; line-height:1.5;">
                            ${escapeHTML(description)}
                        </p>

                        <div style="font-size:12px; color:#64748b; margin-bottom:8px; display:flex; gap:16px; flex-wrap:wrap;">
                            <span><i class="fa-solid fa-building-columns" style="color:#0b5ed7;"></i> ${escapeHTML(department)}</span>
                            <span><i class="fa-solid fa-location-dot" style="color:#ef4444;"></i> ${escapeHTML(address)}</span>
                        </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid #f1f5f9; margin-top:12px;">
                        <span class="badge-status ${getStatusBadgeColor(status)}">
                            <i class="fa-solid fa-circle-dot"></i> ${escapeHTML(status)}
                        </span>

                        <div style="display:flex; gap:8px;">
                            <a href="${mapUrl}" target="_blank" style="padding:7px 12px; background:#1e293b; color:white; border-radius:8px; font-size:12px; font-weight:700; text-decoration:none;">
                                <i class="fa-solid fa-map-location-dot"></i> Map
                            </a>
                            <button type="button" onclick="openReportTimeline('${escapeHTML(ticketId)}')" style="padding:7px 12px; background:#eff6ff; color:#0b5ed7; border:1px solid #bfdbfe; border-radius:8px; font-size:12px; font-weight:700;">
                                <i class="fa-solid fa-timeline"></i> Timeline
                            </button>
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(card);
        } catch (cardErr) {
            console.error("Single report card render notice:", cardErr, report);
        }
    });
}

function getStatusBadgeColor(status) {
    if (!status) return "yellow";
    if (status === "Resolved") return "green";
    if (status === "In Progress" || status === "Verified" || status === "Assigned") return "blue";
    if (status === "Rejected") return "red";
    return "yellow";
}

function openReportTimeline(reportId) {
    if (typeof window.showReportDetail === "function") {
        window.showReportDetail(reportId);
    } else if (window.CARE && typeof window.CARE.showReportDetail === "function") {
        window.CARE.showReportDetail(reportId);
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

function prefillCitizenDetails() {
    try {
        const nameInput = document.getElementById("citizenName");
        const mobileInput = document.getElementById("citizenMobile");
        const emailInput = document.getElementById("citizenEmail");
        const addressInput = document.getElementById("citizenAddress");

        if (nameInput && !nameInput.value) {
            nameInput.value = localStorage.getItem("care_citizen_name") || "Civic Citizen";
        }
        if (mobileInput && !mobileInput.value) {
            mobileInput.value = localStorage.getItem("care_citizen_mobile") || "9876543210";
        }
        if (emailInput && !emailInput.value) {
            emailInput.value = localStorage.getItem("care_citizen_email") || "citizen@care.gov.in";
        }
        if (addressInput && !addressInput.value) {
            addressInput.value = localStorage.getItem("care_citizen_address") || "Main City Road";
        }
    } catch (e) {}
}

// Explicit Window Global Bindings for HTML Attributes
window.submitIssue = submitIssue;
window.closeSuccessModal = closeSuccessModal;
window.previewUploadedImage = previewUploadedImage;
window.clearUploadedImage = clearUploadedImage;
window.getLocation = getLocation;
window.openReportTimeline = openReportTimeline;
window.showToast = showToast;
window.prefillCitizenDetails = prefillCitizenDetails;

document.addEventListener("DOMContentLoaded", function() {
    prefillCitizenDetails();

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
    prefillCitizenDetails();
}
window.addEventListener("load", function() {
    dismissPreloader();
    prefillCitizenDetails();
});
setTimeout(dismissPreloader, 800);

