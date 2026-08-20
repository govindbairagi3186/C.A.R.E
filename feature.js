/* =====================================================
   C.A.R.E.
   Civic Action and Reporting Engine

   FEATURES:

   1. Municipal Department Assignment
   2. Issue Status Tracking
   3. Map-Based Reports
   4. Citizen Tracking
===================================================== */

(function () {

    "use strict";

    /* =================================================
       DATABASE
    ================================================= */

    const REPORT_KEY = "care_reports_v2";

    const CITIZEN_KEY = "care_citizen_id";


    /* =================================================
       AVAILABLE STATUSES
    ================================================= */

    const STATUSES = [
        "Reported",
        "Verified",
        "Assigned",
        "In Progress",
        "Resolved",
        "Rejected"
    ];


    /* =================================================
       AUTOMATIC DEPARTMENT ASSIGNMENT
    ================================================= */

    const DEPARTMENTS = {

        "Pothole":
            "PWD / Roads",

        "Road Damage":
            "PWD / Roads",

        "Garbage":
            "Municipal Sanitation",

        "Streetlight":
            "Electrical / Streetlight",

        "Drainage":
            "Water & Drainage",

        "Water":
            "Water Supply",

        "Other":
            "Municipal Helpdesk"

    };


    /* =================================================
       CATEGORY ICONS
    ================================================= */

    const ICONS = {

        "Pothole": "🕳️",

        "Road Damage": "🚧",

        "Garbage": "🗑️",

        "Streetlight": "💡",

        "Drainage": "🌊",

        "Water": "💧",

        "Other": "📍"

    };


    /* =================================================
       CREATE UNIQUE ID
    ================================================= */

    function generateId(prefix = "CARE") {

        return (

            prefix +

            "-" +

            Date.now()
                .toString(36)
                .toUpperCase() +

            "-" +

            Math.random()
                .toString(36)
                .slice(2, 6)
                .toUpperCase()

        );

    }


    /* =================================================
       CITIZEN ID
    ================================================= */

    function getCitizenId() {

        let id =
            localStorage.getItem(
                CITIZEN_KEY
            );


        if (!id) {

            id =
                "CIT-" +

                Math.random()
                    .toString(36)
                    .slice(2, 8)
                    .toUpperCase();


            localStorage.setItem(
                CITIZEN_KEY,
                id
            );

        }


        return id;

    }


    /* =================================================
       READ REPORTS
    ================================================= */

    function getReports() {

        try {

            return JSON.parse(

                localStorage.getItem(
                    REPORT_KEY
                ) || "[]"

            );

        }

        catch {

            return [];

        }

    }


    /* =================================================
       SAVE REPORTS
    ================================================= */

    function saveReports(reports) {

        localStorage.setItem(

            REPORT_KEY,

            JSON.stringify(
                reports
            )

        );


        window.dispatchEvent(

            new CustomEvent(
                "care:reports-updated"
            )

        );

    }


    /* =================================================
       HTML SECURITY
    ================================================= */

    function escapeHTML(value) {

        return String(
            value ?? ""
        ).replace(

            /[&<>"']/g,

            character => ({

                "&": "&amp;",

                "<": "&lt;",

                ">": "&gt;",

                '"': "&quot;",

                "'": "&#039;"

            })[character]

        );

    }


    /* =================================================
       DATE FORMAT
    ================================================= */

    function formatDate(date) {

        if (!date)
            return "—";


        return new Date(
            date
        ).toLocaleString(

            "en-IN",

            {

                day: "2-digit",

                month: "short",

                year: "numeric",

                hour: "2-digit",

                minute: "2-digit"

            }

        );

    }


    /* =================================================
       DEPARTMENT FINDER
    ================================================= */

    function getDepartment(category) {

        return (

            DEPARTMENTS[
                category
            ] ||

            DEPARTMENTS.Other

        );

    }


    /* =================================================
       CREATE DEMO REPORT
    ================================================= */

    function createDemoReport() {

        const reports =
            getReports();


        if (reports.length)
            return;


        const now =
            Date.now();


        const report = {

            id:
                "CARE-DEMO-001",

            citizenId:
                getCitizenId(),

            citizenName:
                "Demo Citizen",

            category:
                "Pothole",

            description:
                "Large pothole reported near the main road.",

            latitude:
                28.9845,

            longitude:
                77.7064,

            department:
                "PWD / Roads",

            ward:
                "Ward 12",

            assignedTo:
                "Road Maintenance Team",

            status:
                "In Progress",

            createdAt:
                new Date(
                    now - 86400000
                ).toISOString(),

            updatedAt:
                new Date(
                    now - 3600000
                ).toISOString(),

            timeline: [

                [
                    "Reported",

                    new Date(
                        now - 86400000
                    ).toISOString(),

                    "Citizen submitted report."
                ],

                [
                    "Verified",

                    new Date(
                        now - 82800000
                    ).toISOString(),

                    "Municipal desk verified the issue."
                ],

                [
                    "Assigned",

                    new Date(
                        now - 72000000
                    ).toISOString(),

                    "Assigned to PWD / Roads."
                ],

                [
                    "In Progress",

                    new Date(
                        now - 3600000
                    ).toISOString(),

                    "Repair team started work."
                ]

            ]

        };


        saveReports([
            report
        ]);

    }


    /* =================================================
       CREATE FEATURE PANEL
    ================================================= */

    function createPanel() {

        if (
            document.getElementById(
                "careFeaturePanel"
            )
        )
            return;


        const panel =
            document.createElement(
                "div"
            );


        panel.id =
            "careFeaturePanel";


        panel.innerHTML = `

            <div
                class="care-backdrop"
                data-care-close
            ></div>


            <section
                class="care-panel"
            >

                <header
                    class="care-panel-head"
                >

                    <div>

                        <span
                            class="care-kicker"
                        >
                            C.A.R.E. OPERATIONS
                        </span>

                        <h2
                            id="carePanelTitle"
                        >
                            Citizen Center
                        </h2>

                    </div>


                    <button
                        class="care-close"
                        type="button"
                        data-care-close
                    >
                        ×
                    </button>

                </header>


                <div
                    class="care-panel-body"
                    id="carePanelBody"
                ></div>

            </section>

        `;


        document.body.appendChild(
            panel
        );


        panel
            .querySelectorAll(
                "[data-care-close]"
            )
            .forEach(

                element => {

                    element.onclick =
                        closePanel;

                }

            );

    }


    /* =================================================
       OPEN PANEL
    ================================================= */

    function openPanel(
        title,
        html
    ) {

        createPanel();


        document.getElementById(
            "carePanelTitle"
        ).textContent =
            title;


        document.getElementById(
            "carePanelBody"
        ).innerHTML =
            html;


        document.getElementById(
            "careFeaturePanel"
        ).classList.add(
            "open"
        );


        document.body.classList.add(
            "care-lock"
        );

    }


    /* =================================================
       CLOSE PANEL
    ================================================= */

    function closePanel() {

        document
            .getElementById(
                "careFeaturePanel"
            )
            ?.classList.remove(
                "open"
            );


        document.body.classList.remove(
            "care-lock"
        );

    }


    /* =================================================
       CITIZEN TRACKING
    ================================================= */

    function showTracking() {

        const reports =
            getReports().filter(

                report =>
                    report.citizenId ===
                    getCitizenId()

            );


        const total =
            reports.length;


        const active =
            reports.filter(

                report =>

                    ![
                        "Resolved",
                        "Rejected"
                    ].includes(
                        report.status
                    )

            ).length;


        const resolved =
            reports.filter(

                report =>
                    report.status ===
                    "Resolved"

            ).length;


        openPanel(

            "My Civic Reports",

            `

            <div
                class="care-stats"
            >

                <div>

                    <strong>
                        ${total}
                    </strong>

                    <span>
                        Total
                    </span>

                </div>


                <div>

                    <strong>
                        ${active}
                    </strong>

                    <span>
                        Active
                    </span>

                </div>


                <div>

                    <strong>
                        ${resolved}
                    </strong>

                    <span>
                        Resolved
                    </span>

                </div>

            </div>


            <div
                class="care-citizen-id"
            >

                <span>
                    Citizen ID
                </span>

                <strong>
                    ${escapeHTML(
                        getCitizenId()
                    )}
                </strong>

            </div>


            <div
                class="care-report-list"
            >

                ${
                    reports.length

                    ?

                    reports
                        .map(
                            createReportCard
                        )
                        .join("")

                    :

                    `

                    <div
                        class="care-empty"
                    >

                        📋

                        <br><br>

                        You have not submitted
                        any reports yet.

                    </div>

                    `

                }

            </div>

            `

        );


        document
            .querySelectorAll(
                "[data-care-report]"
            )
            .forEach(

                button => {

                    button.onclick =
                        () => {

                            showReportDetail(

                                button
                                    .dataset
                                    .careReport

                            );

                        };

                }

            );

    }


    /* =================================================
       REPORT CARD
    ================================================= */

    function createReportCard(
        report
    ) {

        const icon =
            ICONS[
                report.category
            ] || "📍";


        const statusClass =
            report.status
                .toLowerCase()
                .replaceAll(
                    " ",
                    "-"
                );


        return `

            <article
                class="care-report-card"
            >

                <div
                    class="care-report-top"
                >

                    <div>

                        <span
                            class="care-report-id"
                        >

                            ${escapeHTML(
                                report.id
                            )}

                        </span>


                        <h3>

                            ${icon}

                            ${escapeHTML(
                                report.category
                            )}

                        </h3>

                    </div>


                    <span
                        class="
                            care-status
                            status-${statusClass}
                        "
                    >

                        ${escapeHTML(
                            report.status
                        )}

                    </span>

                </div>


                <p>

                    ${escapeHTML(
                        report.description
                    )}

                </p>


                <div
                    class="care-meta"
                >

                    <span>

                        🏛️

                        ${escapeHTML(
                            report.department
                        )}

                    </span>


                    <span>

                        👷

                        ${escapeHTML(
                            report.assignedTo
                        )}

                    </span>


                    <span>

                        📅

                        ${formatDate(
                            report.updatedAt
                        )}

                    </span>

                </div>


                <button
                    type="button"
                    class="care-btn"
                    data-care-report="${escapeHTML(
                        report.id
                    )}"
                >

                    View Timeline

                </button>

            </article>

        `;

    }


    /* =================================================
       REPORT DETAIL
    ================================================= */

    function showReportDetail(
        reportId
    ) {

        const report =
            getReports().find(

                item =>
                    item.id ===
                    reportId

            );


        if (!report)
            return;


        openPanel(

            "Report Tracking",

            `

            <div
                class="care-detail-grid"
            >

                <div>

                    <span>
                        Report ID
                    </span>

                    <strong>
                        ${escapeHTML(
                            report.id
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Category
                    </span>

                    <strong>

                        ${
                            ICONS[
                                report.category
                            ] || "📍"
                        }

                        ${escapeHTML(
                            report.category
                        )}

                    </strong>

                </div>


                <div>

                    <span>
                        Department
                    </span>

                    <strong>
                        ${escapeHTML(
                            report.department
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Assigned Team
                    </span>

                    <strong>
                        ${escapeHTML(
                            report.assignedTo
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Ward
                    </span>

                    <strong>
                        ${escapeHTML(
                            report.ward
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Current Status
                    </span>

                    <strong>
                        ${escapeHTML(
                            report.status
                        )}
                    </strong>

                </div>

            </div>


            <p
                class="care-description"
            >

                ${escapeHTML(
                    report.description
                )}

            </p>


            <h3>
                📍 Status Timeline
            </h3>


            <div
                class="care-timeline"
            >

                ${
                    (report.timeline || [])
                    .map(

                        (event, index) => `

                        <div
                            class="
                                care-timeline-item
                                ${
                                    index ===
                                    report.timeline.length - 1
                                    ? "current"
                                    : ""
                                }
                            "
                        >

                            <div
                                class="care-dot"
                            >

                                ${index + 1}

                            </div>


                            <div>

                                <strong>
                                    ${escapeHTML(
                                        event[0]
                                    )}
                                </strong>


                                <span>
                                    ${formatDate(
                                        event[1]
                                    )}
                                </span>


                                <p>
                                    ${escapeHTML(
                                        event[2]
                                    )}
                                </p>

                            </div>

                        </div>

                    `

                    )
                    .join("")

                }

            </div>


            <div
                class="care-proof"
            >

                ${
                    report.status ===
                    "Resolved"

                    ?

                    "✅ This civic issue has been resolved."

                    :

                    "🔄 Municipal updates will appear here automatically."

                }

            </div>

            `

        );

    }


    /* =================================================
       LEAFLET MAP
    ================================================= */

    function loadLeaflet() {

        if (window.L)
            return Promise.resolve();


        return new Promise(

            (resolve, reject) => {

                const css =
                    document.createElement(
                        "link"
                    );


                css.rel =
                    "stylesheet";


                css.href =
                    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";


                document.head.appendChild(
                    css
                );


                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";


                script.onload =
                    resolve;


                script.onerror =
                    reject;


                document.body.appendChild(
                    script
                );

            }

        );

    }


    /* =================================================
       SHOW MAP
    ================================================= */

    async function showMap() {

        openPanel(

            "Map-Based Civic Reports",

            `

            <div
                class="care-map-toolbar"
            >

                <span>

                    📍

                    ${
                        getReports().length
                    }

                    Reports

                </span>


                <button
                    type="button"
                    class="care-btn"
                    id="careLocateMe"
                >

                    📍 Use My Location

                </button>

            </div>


            <div
                id="careMap"
                class="care-map"
            ></div>


            <p
                class="care-map-note"
            >

                Map data © OpenStreetMap contributors.

            </p>

            `

        );


        try {

            await loadLeaflet();


            const reports =
                getReports().filter(

                    report =>

                        report.latitude &&
                        report.longitude

                );


            const map =
                L.map(
                    "careMap"
                ).setView(

                    [
                        28.9845,
                        77.7064
                    ],

                    12

                );


            L.tileLayer(

                "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

                {

                    maxZoom: 19,

                    attribution:
                        "&copy; OpenStreetMap contributors"

                }

            ).addTo(
                map
            );


            const bounds = [];


            reports.forEach(

                report => {

                    const marker =
                        L.marker(

                            [
                                report.latitude,
                                report.longitude
                            ]

                        ).addTo(
                            map
                        );


                    marker.bindPopup(`

                        <div
                            class="care-popup"
                        >

                            <strong>

                                ${
                                    ICONS[
                                        report.category
                                    ] || "📍"
                                }

                                ${escapeHTML(
                                    report.category
                                )}

                            </strong>


                            <span>

                                ${escapeHTML(
                                    report.status
                                )}

                            </span>


                            <small>

                                ${escapeHTML(
                                    report.department
                                )}

                            </small>


                            <small>

                                ${escapeHTML(
                                    report.id
                                )}

                            </small>

                        </div>

                    `);


                    bounds.push([

                        report.latitude,

                        report.longitude

                    ]);

                }

            );


            if (
                bounds.length
            ) {

                map.fitBounds(

                    bounds,

                    {

                        padding:
                            [25, 25],

                        maxZoom:
                            15

                    }

                );

            }


            document.getElementById(
                "careLocateMe"
            ).onclick = () => {

                if (
                    !navigator.geolocation
                ) {

                    alert(
                        "Geolocation is not supported."
                    );

                    return;

                }


                navigator
                    .geolocation
                    .getCurrentPosition(

                        position => {

                            const lat =
                                position
                                    .coords
                                    .latitude;


                            const lng =
                                position
                                    .coords
                                    .longitude;


                            map.setView(

                                [
                                    lat,
                                    lng
                                ],

                                16

                            );


                            L.circleMarker(

                                [
                                    lat,
                                    lng
                                ],

                                {
                                    radius:
                                        8
                                }

                            )

                                .addTo(
                                    map
                                )

                                .bindPopup(
                                    "📍 Your current location"
                                )

                                .openPopup();

                        },

                        () => {

                            alert(
                                "Location permission was not granted."
                            );

                        }

                    );

            };

        }

        catch {

            document.getElementById(
                "careMap"
            ).innerHTML = `

                <div
                    class="care-empty"
                >

                    ❌ Map could not load.

                    <br><br>

                    Please check your internet connection.

                </div>

            `;

        }

    }


    /* =================================================
       ADD NAVIGATION
    ================================================= */

    function addNavigation() {

        const nav =
            document.querySelector(
                ".nav"
            );


        if (
            !nav ||
            nav.querySelector(
                ".care-feature-link"
            )
        )
            return;


        const mapButton =
            document.createElement(
                "button"
            );


        mapButton.type =
            "button";


        mapButton.className =
            "nav-link care-feature-link";


        mapButton.textContent =
            "🗺️ Civic Map";


        mapButton.onclick =
            showMap;


        nav.appendChild(
            mapButton
        );


        const trackingButton =
            document.createElement(
                "button"
            );


        trackingButton.type =
            "button";


        trackingButton.className =
            "nav-link care-feature-link";


        trackingButton.textContent =
            "📊 My Reports";


        trackingButton.onclick =
            showTracking;


        nav.appendChild(
            trackingButton
        );

    }


    /* =================================================
       CITIZEN CARD
    ================================================= */

    function addCitizenCard() {

        if (
            document.getElementById(
                "careCitizenCard"
            )
        )
            return;


        const footer =
            document.querySelector(
                "footer"
            );


        if (!footer)
            return;


        const card =
            document.createElement(
                "div"
            );


        card.id =
            "careCitizenCard";


        card.className =
            "care-citizen-card";


        card.innerHTML = `

            <div>

                <span
                    class="care-kicker"
                >

                    CITIZEN TRACKING

                </span>


                <strong>

                    Track Your Civic Reports

                </strong>


                <p>

                    Citizen ID:

                    <code>

                        ${escapeHTML(
                            getCitizenId()
                        )}

                    </code>

                </p>

            </div>


            <div
                class="care-card-actions"
            >

                <button
                    class="care-btn"
                    type="button"
                    id="careMapButton"
                >

                    🗺️ Civic Map

                </button>


                <button
                    class="care-btn primary"
                    type="button"
                    id="careTrackingButton"
                >

                    📊 My Reports

                </button>

            </div>

        `;


        footer.parentNode.insertBefore(

            card,

            footer

        );


        document.getElementById(
            "careMapButton"
        ).onclick =
            showMap;


        document.getElementById(
            "careTrackingButton"
        ).onclick =
            showTracking;

    }


    /* =================================================
       ADMIN LINK
    ================================================= */

    function addAdminLink() {

        if (
            document.querySelector(
                "[data-care-admin]"
            )
        )
            return;


        const link =
            document.createElement(
                "a"
            );


        link.href =
            "care-admin.html";


        link.dataset.careAdmin =
            "true";


        link.className =
            "care-admin-shortcut";


        link.textContent =
            "🛡️ Municipal Control Center";


        const adminArea =
            document.querySelector(
                ".admin-access"
            );


        if (
            adminArea
        ) {

            adminArea.appendChild(
                link
            );

        }

    }


    /* =================================================
       PUBLIC API
    ================================================= */

    window.CARE = {

        getReports,

        saveReports,

        showMap,

        showTracking,

        showReportDetail,

        getDepartment

    };


    /* =================================================
       INITIALIZATION
    ================================================= */

    function initialize() {

        createDemoReport();

        addNavigation();

        addCitizenCard();

        addAdminLink();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(

            "DOMContentLoaded",

            initialize

        );

    }

    else {

        initialize();

    }

})();
