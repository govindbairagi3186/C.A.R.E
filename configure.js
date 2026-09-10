/* =====================================================
   C.A.R.E. CONFIGURATION
   Civic Action and Reporting Engine
===================================================== */

window.CARE_CONFIG = {
    // Application Info
    appName: "C.A.R.E.",
    appFullName: "Civic Action and Reporting Engine",
    edition: "Official Enterprise Edition",
    teamName: "GOVIND VAISHNAV & TEAM",
    
    // Default Map Location (Mathura / Municipal Regional Hub)
    defaultMapCenter: [27.4924, 77.6737], // Mathura / Municipal Center
    defaultZoom: 13,
    
    // Supabase Credentials
    supabaseUrl: "https://wcocovvkzxgxqbscyuuj.supabase.co",
    supabaseAnonKey: "sb_publishable_DaY-2qm2HWCUuLfhaXwFFg_Eg05_MX3",

    // Government Escalation Matrix & Department Directory
    departments: {
        "Pothole": {
            name: "Public Works Department (PWD) - Roads Cell",
            code: "DEPT-PWD-01",
            head: "Chief Engineer (Roads)",
            email: "pwd.roads@care.gov.in",
            phone: "+91-1800-11-793",
            slaHours: 48,
            color: "#e11d48"
        },
        "Garbage": {
            name: "Municipal Solid Waste & Sanitation Dept",
            code: "DEPT-SAN-02",
            head: "Chief Sanitation Inspector",
            email: "sanitation.mc@care.gov.in",
            phone: "+91-1800-11-794",
            slaHours: 24,
            color: "#d97706"
        },
        "Streetlight": {
            name: "Electrical & Public Lighting Division",
            code: "DEPT-ELEC-03",
            head: "Superintending Engineer (Elec)",
            email: "electrical.mc@care.gov.in",
            phone: "+91-1800-11-795",
            slaHours: 36,
            color: "#ca8a04"
        },
        "Drainage": {
            name: "Water Supply & Sewage Management Board",
            code: "DEPT-WAT-04",
            head: "Executive Engineer (Drainage)",
            email: "drainage.board@care.gov.in",
            phone: "+91-1800-11-796",
            slaHours: 24,
            color: "#0284c7"
        },
        "Road Damage": {
            name: "Highway Infrastructure & Traffic Engineering",
            code: "DEPT-INFRA-05",
            head: "Divisional Engineer (Infra)",
            email: "infra.pwd@care.gov.in",
            phone: "+91-1800-11-797",
            slaHours: 72,
            color: "#9333ea"
        },
        "Other": {
            name: "Central Civic Grievance & Public Redressal Cell",
            code: "DEPT-GRIEV-00",
            head: "Nodal Grievance Officer",
            email: "grievance.helpdesk@care.gov.in",
            phone: "+91-1800-11-700",
            slaHours: 48,
            color: "#4b5563"
        }
    },

    // Admin Credentials
    admin: {
        email: "admin@care.gov.in",
        role: "Super Admin Officer"
    }
};

/* =====================================================
   C.A.R.E. THEME ENGINE (LIGHT / DARK MODE SYSTEM)
===================================================== */
(function () {
    "use strict";

    function getStoredTheme() {
        try {
            var stored = localStorage.getItem("care_theme");
            if (stored === "dark" || stored === "light") {
                return stored;
            }
            if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
                return "dark";
            }
        } catch (e) {}
        return "light";
    }

    function syncThemeUI(theme) {
        var isDark = theme === "dark";
        var toggleBtns = document.querySelectorAll(".theme-toggle-btn");
        toggleBtns.forEach(function (btn) {
            var icon = btn.querySelector("i, .theme-icon");
            var text = btn.querySelector(".theme-text, .theme-toggle-text");
            if (isDark) {
                btn.setAttribute("title", "Switch to Light Mode");
                btn.setAttribute("aria-label", "Switch to Light Mode");
                if (icon) {
                    icon.className = "fa-solid fa-sun theme-icon";
                }
                if (text) {
                    text.textContent = "Light Mode";
                }
            } else {
                btn.setAttribute("title", "Switch to Dark Mode");
                btn.setAttribute("aria-label", "Switch to Dark Mode");
                if (icon) {
                    icon.className = "fa-solid fa-moon theme-icon";
                }
                if (text) {
                    text.textContent = "Dark Mode";
                }
            }
        });
    }

    function applyTheme(theme, save) {
        if (save === undefined) save = true;
        var root = document.documentElement;
        root.setAttribute("data-theme", theme);
        if (document.body) {
            if (theme === "dark") {
                document.body.classList.add("dark-mode");
            } else {
                document.body.classList.remove("dark-mode");
            }
        }
        if (save) {
            try {
                localStorage.setItem("care_theme", theme);
            } catch (e) {}
        }
        syncThemeUI(theme);
        window.dispatchEvent(new CustomEvent("care:theme-changed", { detail: { theme: theme } }));
    }

    window.toggleCareTheme = function () {
        var current = document.documentElement.getAttribute("data-theme") || getStoredTheme();
        var next = current === "dark" ? "light" : "dark";
        applyTheme(next, true);
        return next;
    };

    window.setCareTheme = function (theme) {
        applyTheme(theme, true);
    };

    window.getCareTheme = function () {
        return document.documentElement.getAttribute("data-theme") || getStoredTheme();
    };

    // Apply immediate theme attribute to html tag
    var initial = getStoredTheme();
    document.documentElement.setAttribute("data-theme", initial);

    // Sync UI when DOM content is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            applyTheme(initial, false);
        });
    } else {
        applyTheme(initial, false);
    }
})();

