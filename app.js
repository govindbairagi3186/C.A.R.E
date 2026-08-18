/* =====================================================
   CARE
   PHASE 2
   SUPABASE CIVIC ISSUE REPORTING
===================================================== */


/* =====================================================
   SUPABASE CONFIGURATION
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
   PAGE NAVIGATION
===================================================== */

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

        loadReports();

    }

}


/* =====================================================
   NAVIGATION
===================================================== */

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

        if (navLinks[links[page]]) {

            navLinks[
                links[page]
            ].classList.add("active");

        }

    }

}


/* =====================================================
   START REPORT
===================================================== */

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


/* =====================================================
   GPS LOCATION
===================================================== */

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


/* =====================================================
   GENERATE REPORT ID
===================================================== */

function generateReportId() {

    const number =
        Math.floor(
            100000 +
            Math.random() * 900000
        );

    return "CARE-" + number;

}


/* =====================================================
   UPLOAD IMAGE
===================================================== */

async function uploadImage(file, reportId) {

    if (!file) {

        return null;

    }


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const fileName =
        `${reportId}-${Date.now()}.${extension}`;


    const filePath =
        `reports/${fileName}`;


    const {
        error
    } =
        await supabaseClient
            .storage
            .from("issue-images")
            .upload(
                filePath,
                file,
                {

                    cacheControl: "3600",

                    upsert: false

                }
            );


    if (error) {

        console.error(
            "Image upload error:",
            error
        );

        throw error;

    }


    const {
        data
    } =
        supabaseClient
            .storage
            .from("issue-images")
            .getPublicUrl(
                filePath
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


    /* -----------------------------
       VALIDATION
    ----------------------------- */

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


    /* -----------------------------
       BUTTON
    ----------------------------- */

    const submitButton =
        document.querySelector(
            "#issueForm button[type='submit']"
        );


    const originalText =
        submitButton.textContent;


    submitButton.disabled = true;

    submitButton.textContent =
        "Submitting...";


    try {

        /* -------------------------
           CREATE REPORT ID
        ------------------------- */

        const reportId =
            generateReportId();


        /* -------------------------
           UPLOAD IMAGE
        ------------------------- */

        let imageUrl = null;


        if (imageFile) {

            showToast(
                "Uploading photo..."
            );


            imageUrl =
                await uploadImage(
                    imageFile,
                    reportId
                );

        }


        /* -------------------------
           INSERT DATABASE RECORD
        ------------------------- */

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
                        parseFloat(
                            latitude
                        ),

                    longitude:
                        parseFloat(
                            longitude
                        ),

                    image_url:
                        imageUrl,

                    status:
                        "Reported",

                    priority:
                        "Medium"

                });


        if (error) {

            console.error(
                "Database error:",
                error
            );

            throw error;

        }


        /* -------------------------
           SUCCESS
        ------------------------- */

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


        setTimeout(() => {

            showPage("reports");

        }, 1200);


    } catch (error) {

        console.error(error);


        showToast(
            "Unable to submit report. Please try again."
        );


    } finally {

        submitButton.disabled =
            false;

        submitButton.textContent =
            originalText;

    }

}


/* =====================================================
   LOAD REPORTS FROM SUPABASE
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

        <div class="issue-card">

            <div class="issue-content">

                <h3>
                    Loading reports...
                </h3>

                <p>
                    Please wait.
                </p>

            </div>

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

        console.error(
            "Loading reports error:",
            error
        );


        container.innerHTML = `

            <div class="issue-card">

                <div class="issue-content">

                    <h3>
                        Unable to load reports
                    </h3>

                    <p>
                        Please refresh the page.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    renderReports(data || []);


    updateStatistics(
        data || []
    );

}


/* =====================================================
   RENDER REPORTS
===================================================== */

function renderReports(reports) {

    const container =
        document.getElementById(
            "issuesContainer"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    if (!reports.length) {

        container.innerHTML = `

            <div class="issue-card">

                <div class="issue-content">

                    <h3>
                        No reports yet
                    </h3>

                    <p>
                        Be the first citizen
                        to report a civic issue.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    reports.forEach(report => {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "issue-card";


        const imageHTML =
            report.image_url

                ? `
                    <div class="issue-image">
                        <img
                            src="${escapeHTML(
                                report.image_url
                            )}"
                            alt="Reported civic issue"
                            style="
                                width:100%;
                                height:100%;
                                object-fit:cover;
                                border-radius:inherit;
                            "
                        >
                    </div>
                `

                : `
                    <div class="issue-image">
                        ${getCategoryIcon(
                            report.category
                        )}
                    </div>
                `;


        card.innerHTML = `

            ${imageHTML}

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

                ${
                    report.latitude &&
                    report.longitude

                        ? `
                            <p>
                                📍
                                ${Number(
                                    report.latitude
                                ).toFixed(5)},
                                ${Number(
                                    report.longitude
                                ).toFixed(5)}
                            </p>
                        `

                        : ""
                }

            </div>

        `;


        container.appendChild(
            card
        );

    });

}


/* =====================================================
   CATEGORY ICON
===================================================== */

function getCategoryIcon(category) {

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

function updateStatistics(reports) {

    const total =
        reports.length;


    const verified =
        reports.filter(
            report =>
                report.status ===
                "Verified"
        ).length;


    const progress =
        reports.filter(
            report =>
                report.status ===
                "In Progress"
        ).length;


    const resolved =
        reports.filter(
            report =>
                report.status ===
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

}


/* =====================================================
   TOAST
===================================================== */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    if (!toast || !toastMessage) {

        return;

    }


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


/* =====================================================
   SECURITY
===================================================== */

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


/* =====================================================
   FORM EVENT
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

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
