/* =====================================================
   C.A.R.E.
   Civic Action and Reporting Engine
   Phase 2 — Supabase
===================================================== */


/* =====================================================
   SUPABASE
===================================================== */

const SUPABASE_URL =
    "https://wcocovvkzxgxqbscyuuj.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_DaY-2qm2HWCUuLfhaXwFFg_Eg05_MX3";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =====================================================
   NAVIGATION
===================================================== */

function showPage(page) {

    const pages = {

        home: "homePage",

        report: "reportPage",

        reports: "reportsPage",

        about: "aboutPage"

    };


    Object.values(pages).forEach(
        id => {

            const element =
                document.getElementById(id);

            if (element) {

                element.classList.remove(
                    "active-page"
                );

            }

        }
    );


    const selectedPage =
        document.getElementById(
            pages[page]
        );


    if (selectedPage) {

        selectedPage.classList.add(
            "active-page"
        );

    }


    document
        .querySelectorAll(".nav-link")
        .forEach(link => {

            link.classList.remove(
                "active"
            );

        });


    const navLinks =
        document.querySelectorAll(
            ".nav-link"
        );


    if (page === "home" && navLinks[0]) {

        navLinks[0].classList.add(
            "active"
        );

    }


    if (page === "reports" && navLinks[1]) {

        navLinks[1].classList.add(
            "active"
        );

    }


    if (page === "about" && navLinks[2]) {

        navLinks[2].classList.add(
            "active"
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    if (page === "reports") {

        loadReports();

    }

}


/* =====================================================
   START REPORT
===================================================== */

function startReport(category) {

    showPage("report");


    const categorySelect =
        document.getElementById(
            "category"
        );


    if (categorySelect) {

        categorySelect.value =
            category;

    }

}


/* =====================================================
   LOCATION
===================================================== */

function getLocation() {

    const locationText =
        document.getElementById(
            "locationText"
        );


    if (!navigator.geolocation) {

        locationText.textContent =
            "GPS is not supported by this browser.";

        showToast(
            "GPS is not supported."
        );

        return;

    }


    locationText.textContent =
        "Detecting your location...";


    navigator.geolocation.getCurrentPosition(

        position => {

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


            locationText.textContent =
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;


            showToast(
                "Location detected."
            );

        },

        error => {

            console.error(error);


            locationText.textContent =
                "Location permission denied.";


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


/* =====================================================
   REPORT ID
===================================================== */

function generateReportId() {

    const number =
        Math.floor(
            100000 +
            Math.random() * 900000
        );


    return `CARE-${number}`;

}


/* =====================================================
   IMAGE UPLOAD
===================================================== */

async function uploadImage(
    file,
    reportId
) {

    if (!file) {

        return null;

    }


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const path =
        `reports/${reportId}-${Date.now()}.${extension}`;


    const {
        error
    } =
        await supabaseClient
            .storage
            .from("issue-images")
            .upload(
                path,
                file
            );


    if (error) {

        throw error;

    }


    const {
        data
    } =
        supabaseClient
            .storage
            .from("issue-images")
            .getPublicUrl(
                path
            );


    return data.publicUrl;

}


/* =====================================================
   SUBMIT ISSUE
===================================================== */

async function submitIssue(event) {

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


    const imageInput =
        document.getElementById(
            "image"
        );


    const imageFile =
        imageInput.files[0];


    if (!category) {

        showToast(
            "Please select a category."
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
            "Please detect the issue location."
        );

        return;

    }


    const button =
        document.querySelector(
            "#issueForm button[type='submit']"
        );


    const originalText =
        button.textContent;


    button.disabled = true;

    button.textContent =
        "Submitting...";


    try {

        const reportId =
            generateReportId();


        let imageUrl = null;


        if (imageFile) {

            button.textContent =
                "Uploading photo...";


            imageUrl =
                await uploadImage(
                    imageFile,
                    reportId
                );

        }


        button.textContent =
            "Saving report...";


        const {
            error
        } =
            await supabaseClient
                .from("issues")
                .insert({

                    issue_code:
                        reportId,

                    category:
                        category,

                    description:
                        description,

                    latitude:
                        Number(latitude),

                    longitude:
                        Number(longitude),

                    image_url:
                        imageUrl,

                    status:
                        "Reported",

                    priority:
                        "Medium"

                });


        if (error) {

            console.error(error);

            throw error;

        }


        document
            .getElementById(
                "issueForm"
            )
            .reset();


        document.getElementById(
            "latitude"
        ).value = "";


        document.getElementById(
            "longitude"
        ).value = "";


        document.getElementById(
            "locationText"
        ).textContent =
            "Location not captured yet";


        showToast(
            `Report ${reportId} submitted successfully!`
        );


        setTimeout(
            () => {

                showPage(
                    "reports"
                );

            },
            1000
        );


    } catch (error) {

        console.error(
            "CARE submission error:",
            error
        );


        showToast(
            "Report could not be submitted."
        );


    } finally {

        button.disabled = false;

        button.textContent =
            originalText;

    }

}


/* =====================================================
   LOAD REPORTS
===================================================== */

async function loadReports() {

    const container =
        document.getElementById(
            "issuesContainer"
        );


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="empty-state">

            <div>
                ⏳
            </div>

            <h3>
                Loading reports...
            </h3>

            <p>
                Please wait.
            </p>

        </div>

    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("issues")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(error);


        container.innerHTML = `

            <div class="empty-state">

                <div>
                    ⚠️
                </div>

                <h3>
                    Unable to load reports
                </h3>

                <p>
                    Please try again.
                </p>

            </div>

        `;

        return;

    }


    renderReports(
        data || []
    );


    updateStatistics(
        data || []
    );


    const heroCount =
        document.getElementById(
            "heroReportCount"
        );


    if (heroCount) {

        heroCount.textContent =
            data.length;

    }

}


/* =====================================================
   RENDER REPORTS
===================================================== */

function renderReports(
    reports
) {

    const container =
        document.getElementById(
            "issuesContainer"
        );


    if (!container) {

        return;

    }


    if (!reports.length) {

        container.innerHTML = `

            <div class="empty-state">

                <div>
                    📍
                </div>

                <h3>
                    No reports yet
                </h3>

                <p>
                    Be the first citizen to report
                    a civic issue through C.A.R.E.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML = "";


    reports.forEach(
        report => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "issue-card";


            const icon =
                getCategoryIcon(
                    report.category
                );


            const image =
                report.image_url

                    ? `
                        <div class="issue-image">

                            <img
                                src="${escapeHTML(
                                    report.image_url
                                )}"
                                alt="Civic issue photo"
                                style="
                                    width:100%;
                                    height:100%;
                                    object-fit:cover;
                                "
                            >

                        </div>
                    `

                    : `
                        <div class="issue-image">
                            ${icon}
                        </div>
                    `;


            card.innerHTML = `

                ${image}

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
                            ${escapeHTML(
                                report.issue_code
                            )}
                        </strong>
                    </p>

                    <span class="status">
                        ${escapeHTML(
                            report.status
                        )}
                    </span>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );

}


/* =====================================================
   ICONS
===================================================== */

function getCategoryIcon(
    category
) {

    const icons = {

        Pothole: "🕳️",

        Garbage: "🗑️",

        Streetlight: "💡",

        Drainage: "🌊",

        "Road Damage": "🚧",

        Other: "📍"

    };


    return (
        icons[category] ||
        "📍"
    );

}


/* =====================================================
   STATISTICS
===================================================== */

function updateStatistics(
    reports
) {

    const total =
        reports.length;


    const verified =
        reports.filter(
            r =>
                r.status ===
                "Verified"
        ).length;


    const progress =
        reports.filter(
            r =>
                r.status ===
                "In Progress"
        ).length;


    const resolved =
        reports.filter(
            r =>
                r.status ===
                "Resolved"
        ).length;


    const totalElement =
        document.getElementById(
            "totalIssues"
        );


    const verifiedElement =
        document.getElementById(
            "verifiedIssues"
        );


    const progressElement =
        document.getElementById(
            "progressIssues"
        );


    const resolvedElement =
        document.getElementById(
            "resolvedIssues"
        );


    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (verifiedElement) {

        verifiedElement.textContent =
            verified;

    }


    if (progressElement) {

        progressElement.textContent =
            progress;

    }


    if (resolvedElement) {

        resolvedElement.textContent =
            resolved;

    }


    const heroCount =
        document.getElementById(
            "heroReportCount"
        );


    if (heroCount) {

        heroCount.textContent =
            total;

    }

}


/* =====================================================
   TOAST
===================================================== */

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    const messageElement =
        document.getElementById(
            "toastMessage"
        );


    if (!toast || !messageElement) {

        return;

    }


    messageElement.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
    value
) {

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


/* =====================================================
   INITIALIZATION
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "issueForm"
            );


        if (form) {

            form.addEventListener(
                "submit",
                submitIssue
            );

        }


        loadReports();

    }
);
