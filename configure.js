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
    
    // Default Map Location (Center of India / Major Municipal Hub)
    defaultMapCenter: [28.6139, 77.2090], // New Delhi / National Capital Region
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
