/* =====================================================
   CARE
   PHASE 1
===================================================== */


/* =========================
   DEMO DATA
========================= */

let demoReports = [

    {
        id: "CIV-1001",
        category: "Pothole",
        description:
            "Large pothole reported near the main road.",
        status: "Reported"
    },

    {
        id: "CIV-1002",
        category: "Garbage",
        description:
            "Garbage has not been collected for several days.",
        status: "In Progress"
    },

    {
        id: "CIV-1003",
        category: "Streetlight",
        description:
            "Streetlight is not working at the intersection.",
        status: "Resolved"
    }

];


/* =========================
   PAGE NAVIGATION
========================= */

function showPage(page) {

    const pages = {

        home: "homePage",

        report: "reportPage",

        reports: "reportsPage",

        about: "aboutPage"

    };


    Object.values(pages).forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {

            element.classList.remove(
                "active-page"
            );

        }

    });


    const selected =
        document.getElementById(
            pages[page]
        );


    if (selected) {

        selected.classList.add(
            "active-page"
        );

    }


    updateNavigation(page);


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });


    if (page === "reports") {

        renderReports();

    }

}


/* =========================
   NAVIGATION ACTIVE STATE
========================= */

function updateNavigation(page) {

    document
        .querySelectorAll(".nav-link")
        .forEach(button => {

            button.classList.remove(
                "active"
            );

        });


    const links = {

        home: 0,

        reports: 1,

        about: 2

    };


    if (links[page] !== undefined) {

        const navLinks =
            document.querySelectorAll(
                ".nav-link"
            );

        navLinks[
            links[page]
        ].classList.add("active");

    }

}


/* =========================
   START REPORT
========================= */

function startReport(category) {

    showPage("report");


    setTimeout(() => {

        const categorySelect =
            document.getElementById(
                "category"
            );


        if (categorySelect) {

            categorySelect.value =
                category;

        }

    }, 100);

}


/* =========================
   GET LOCATION
========================= */

function getLocation() {

    const text =
        document.getElementById(
            "locationText"
        );


    if (!navigator.geolocation) {

        text.textContent =
            "Geolocation is not supported.";

        showToast(
            "Your browser does not support GPS."
        );

        return;

    }


    text.textContent =
        "Detecting your location...";


    navigator.geolocation.getCurrentPosition(

        function(position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            document.getElementById(
                "latitude"
            ).value =
                latitude;


            document.getElementById(
                "longitude"
            ).value =
                longitude;


            text.textContent =
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;


            showToast(
                "Location detected successfully."
            );

        },


        function(error) {

            console.error(error);


            text.textContent =
                "Location permission was not granted.";


            showToast(
                "Please allow location permission."
            );

        },

        {

            enableHighAccuracy: true,

            timeout: 10000,

            maximumAge: 0

        }

    );

}


/* =========================
   FORM
========================= */

document
    .getElementById("issueForm")
    .addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


            const category =
                document.getElementById(
                    "category"
                ).value;


            const description =
                document.getElementById(
                    "description"
                ).value.trim();


            const latitude =
                document.getElementById(
                    "latitude"
                ).value;


            const longitude =
                document.getElementById(
                    "longitude"
                ).value;


            if (!category) {

                showToast(
                    "Please select an issue category."
                );

                return;

            }


            if (!description) {

                showToast(
                    "Please describe the issue."
                );

                return;

            }


            if (!latitude || !longitude) {

                showToast(
                    "Please detect your location first."
                );

                return;

            }


            const newReport = {

                id:
                    "CIV-" +
                    Math.floor(
                        1000 +
                        Math.random() * 9000
                    ),

                category:

                    category,

                description:

                    description,

                status:

                    "Reported"

            };


            demoReports.unshift(
                newReport
            );


            document
                .getElementById(
                    "issueForm"
                )
                .reset();


            document.getElementById(
                "locationText"
            ).textContent =
                "Location not captured yet";


            showToast(
                `Report ${newReport.id} submitted successfully!`
            );


            updateStatistics();


            setTimeout(() => {

                showPage("reports");

            }, 1200);

        }
    );


/* =========================
   RENDER REPORTS
========================= */

function renderReports() {

    const container =
        document.getElementById(
            "issuesContainer"
        );


    if (!container) return;


    container.innerHTML = "";


    if (demoReports.length === 0) {

        container.innerHTML = `

            <div class="issue-card">

                <div class="issue-content">

                    <h3>
                        No reports yet
                    </h3>

                    <p>
                        Be the first citizen to report
                        a civic issue.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    demoReports.forEach(report => {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "issue-card";


        card.innerHTML = `

            <div class="issue-image">

                ${getCategoryIcon(
                    report.category
                )}

            </div>


            <div class="issue-content">

                <h3>
                    ${escapeHTML(
                        report.category
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        report.description
                    )}
                </p>

                <p>
                    <strong>
                        ${report.id}
                    </strong>
                </p>

                <span class="status">
                    ${escapeHTML(
                        report.status
                    )}
                </span>

            </div>

        `;


        container.appendChild(card);

    });

}


/* =========================
   CATEGORY ICON
========================= */

function getCategoryIcon(category) {

    const icons = {

        Pothole: "🕳️",

        Garbage: "🗑️",

        Streetlight: "💡",

        Drainage: "🌊",

        "Road Damage": "🚧",

        Other: "📍"

    };


    return icons[category] || "📍";

}


/* =========================
   STATISTICS
========================= */

function updateStatistics() {

    const total =
        demoReports.length;


    const verified =
        demoReports.filter(
            report =>
                report.status ===
                "Verified"
        ).length;


    const progress =
        demoReports.filter(
            report =>
                report.status ===
                "In Progress"
        ).length;


    const resolved =
        demoReports.filter(
            report =>
                report.status ===
                "Resolved"
        ).length;


    document.getElementById(
        "totalIssues"
    ).textContent =
        total;


    document.getElementById(
        "verifiedIssues"
    ).textContent =
        verified;


    document.getElementById(
        "progressIssues"
    ).textContent =
        progress;


    document.getElementById(
        "resolvedIssues"
    ).textContent =
        resolved;

}


/* =========================
   TOAST
========================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    toastMessage.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 3000);

}


/* =========================
   SECURITY
========================= */

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================
   START APPLICATION
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        updateStatistics();

        renderReports();

    }
);
