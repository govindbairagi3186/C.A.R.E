/* =====================================================
   C.A.R.E.
   Civic Action and Reporting Engine
   Citizen Reporting System
===================================================== */


/* =====================================================
   SUPABASE
===================================================== */

const SUPABASE_URL =
    "https://wcocovvkzxgxqbscyuuj.supabase.co";


/*
    IMPORTANT:

    Use ONLY your Supabase Publishable key here.

    NEVER put:
    - admin password
    - service_role key
    - secret key
*/

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


    if (
        page === "home" &&
        navLinks[0]
    ) {

        navLinks[0].classList.add(
            "active"
        );

    }


    if (
        page === "reports" &&
        navLinks[1]
    ) {

        navLinks[1].classList.add(
            "active"
        );

    }


    if (
        page === "about" &&
        navLinks[2]
    ) {

        navLinks[2].classList.add(
            "active"
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    if (
        page === "reports"
    ) {

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


    addCitizenFields();

}


/* =====================================================
   CITIZEN DETAILS FORM
===================================================== */

function addCitizenFields() {

    const issueForm =
        document.getElementById(
            "issueForm"
        );


    if (!issueForm) {

        return;

    }


    if (
        document.getElementById(
            "citizenDetails"
        )
    ) {

        return;

    }


    const section =
        document.createElement(
            "div"
        );


    section.id =
        "citizenDetails";


    section.innerHTML = `

        <div
            style="
                margin:25px 0 18px;
                padding:20px;
                border-radius:16px;
                background:#f8fafc;
                border:1px solid #e2e8f0;
            "
        >

            <h3
                style="
                    margin-bottom:6px;
                    font-size:19px;
                "
            >
                👤 Your Details
            </h3>

            <p
                style="
                    color:#64748b;
                    font-size:13px;
                    margin-bottom:18px;
                "
            >
                These details help C.A.R.E. authorities
                contact you about your report.
            </p>


            <div
                style="
                    display:grid;
                    grid-template-columns:
                        repeat(
                            auto-fit,
                            minmax(220px,1fr)
                        );
                    gap:15px;
                "
            >

                <div>

                    <label
                        for="citizenName"
                        style="
                            display:block;
                            font-weight:700;
                            font-size:13px;
                            margin-bottom:6px;
                        "
                    >
                        Full Name *
                    </label>

                    <input
                        id="citizenName"
                        type="text"
                        maxlength="100"
                        autocomplete="name"
                        placeholder="Enter your full name"
                        required
                        style="
                            width:100%;
                            padding:12px;
                            border:
                                1px solid #cbd5e1;
                            border-radius:9px;
                        "
                    >

                </div>


                <div>

                    <label
                        for="citizenMobile"
                        style="
                            display:block;
                            font-weight:700;
                            font-size:13px;
                            margin-bottom:6px;
                        "
                    >
                        Mobile Number *
                    </label>

                    <input
                        id="citizenMobile"
                        type="tel"
                        inputmode="numeric"
                        maxlength="10"
                        pattern="[0-9]{10}"
                        autocomplete="tel"
                        placeholder="10-digit mobile number"
                        required
                        style="
                            width:100%;
                            padding:12px;
                            border:
                                1px solid #cbd5e1;
                            border-radius:9px;
                        "
                    >

                </div>


                <div>

                    <label
                        for="citizenEmail"
                        style="
                            display:block;
                            font-weight:700;
                            font-size:13px;
                            margin-bottom:6px;
                        "
                    >
                        Gmail / Email *
                    </label>

                    <input
                        id="citizenEmail"
                        type="email"
                        maxlength="150"
                        autocomplete="email"
                        placeholder="example@gmail.com"
                        required
                        style="
                            width:100%;
                            padding:12px;
                            border:
                                1px solid #cbd5e1;
                            border-radius:9px;
                        "
                    >

                </div>


                <div>

                    <label
                        for="citizenAddress"
                        style="
                            display:block;
                            font-weight:700;
                            font-size:13px;
                            margin-bottom:6px;
                        "
                    >
                        Address / Landmark *
                    </label>

                    <input
                        id="citizenAddress"
                        type="text"
                        maxlength="250"
                        autocomplete="street-address"
                        placeholder="Area, street, landmark"
                        required
                        style="
                            width:100%;
                            padding:12px;
                            border:
                                1px solid #cbd5e1;
                            border-radius:9px;
                        "
                    >

                </div>

            </div>

        </div>

    `;


    const description =
        document.getElementById(
            "description"
        );


    if (
        description &&
        description.parentElement
    ) {

        description.parentElement.before(
            section
        );

    } else {

        issueForm.prepend(
            section
        );

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


    if (!locationText) {

        return;

    }


    if (
        !navigator.geolocation
    ) {

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


            const latitudeInput =
                document.getElementById(
                    "latitude"
                );


            const longitudeInput =
                document.getElementById(
                    "longitude"
                );


            if (latitudeInput) {

                latitudeInput.value =
                    latitude;

            }


            if (longitudeInput) {

                longitudeInput.value =
                    longitude;

            }


            locationText.textContent =
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;


            showToast(
                "Location detected."
            );

        },


        error => {

            console.error(
                "Location error:",
                error
            );


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
   VALIDATE MOBILE
===================================================== */

function validateMobile(
    mobile
) {

    return /^[0-9]{10}$/.test(
        mobile
    );

}


/* =====================================================
   SUBMIT ISSUE
===================================================== */

async function submitIssue(
    event
) {

    event.preventDefault();


    addCitizenFields();


    const nameInput =
        document.getElementById(
            "citizenName"
        );


    const mobileInput =
        document.getElementById(
            "citizenMobile"
        );


    const emailInput =
        document.getElementById(
            "citizenEmail"
        );


    const addressInput =
        document.getElementById(
            "citizenAddress"
        );


    const categoryInput =
        document.getElementById(
            "category"
        );


    const descriptionInput =
        document.getElementById(
            "description"
        );


    const latitudeInput =
        document.getElementById(
            "latitude"
        );


    const longitudeInput =
        document.getElementById(
            "longitude"
        );


    const imageInput =
        document.getElementById(
            "image"
        );


    const name =
        nameInput
            ? nameInput.value.trim()
            : "";


    const mobile =
        mobileInput
            ? mobileInput.value.trim()
            : "";


    const email =
        emailInput
            ? emailInput.value.trim()
            : "";


    const address =
        addressInput
            ? addressInput.value.trim()
            : "";


    const category =
        categoryInput
            ? categoryInput.value
            : "";


    const description =
        descriptionInput
            ? descriptionInput.value.trim()
            : "";


    const latitude =
        latitudeInput
            ? latitudeInput.value
            : "";


    const longitude =
        longitudeInput
            ? longitudeInput.value
            : "";


    const imageFile =
        imageInput &&
        imageInput.files
            ? imageInput.files[0]
            : null;


    /* -------------------------------------------------
       VALIDATION
    ------------------------------------------------- */

    if (!name) {

        showToast(
            "Please enter your name."
        );

        nameInput?.focus();

        return;

    }


    if (!validateMobile(mobile)) {

        showToast(
            "Please enter a valid 10-digit mobile number."
        );

        mobileInput?.focus();

        return;

    }


    if (!email) {

        showToast(
            "Please enter your email."
        );

        emailInput?.focus();

        return;

    }


    if (!address) {

        showToast(
            "Please enter your address or landmark."
        );

        addressInput?.focus();

        return;

    }


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


    if (
        !latitude ||
        !longitude
    ) {

        showToast(
            "Please detect the issue location."
        );

        return;

    }


    /* -------------------------------------------------
       SUBMIT BUTTON
    ------------------------------------------------- */

    const button =
        document.querySelector(
            "#issueForm button[type='submit']"
        );


    const originalText =
        button
            ? button.textContent
            : "";


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Submitting...";

    }


    try {

        const reportId =
            generateReportId();


        let imageUrl =
            null;


        /* -------------------------------------------------
           IMAGE
        ------------------------------------------------- */

        if (imageFile) {

            if (button) {

                button.textContent =
                    "Uploading photo...";

            }


            imageUrl =
                await uploadImage(
                    imageFile,
                    reportId
                );

        }


        /* -------------------------------------------------
           SAVE REPORT
        ------------------------------------------------- */

        if (button) {

            button.textContent =
                "Sending to C.A.R.E....";

        }


        const {
            error
        } =
            await supabaseClient
                .from("issues")
                .insert({

                    issue_code:
                        reportId,

                    citizen_name:
                        name,

                    citizen_mobile:
                        mobile,

                    citizen_email:
                        email,

                    address:
                        address,

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

            console.error(
                "Supabase error:",
                error
            );

            throw error;

        }


        /* -------------------------------------------------
           SUCCESS
        ------------------------------------------------- */

        document
            .getElementById(
                "issueForm"
            )
            ?.reset();


        if (latitudeInput) {

            latitudeInput.value =
                "";

        }


        if (longitudeInput) {

            longitudeInput.value =
                "";

        }


        if (locationTextExists()) {

            document
                .getElementById(
                    "locationText"
                )
                .textContent =
                "Location not captured yet";

        }


        showToast(
            `✅ Report ${reportId} submitted successfully!`
        );


        setTimeout(
            () => {

                showPage(
                    "reports"
                );

            },
            1200
        );


    } catch (error) {

        console.error(
            "C.A.R.E. submission error:",
            error
        );


        showToast(
            error.message ||
            "Report could not be submitted."
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                originalText;

        }

    }

}


/* =====================================================
   LOCATION ELEMENT CHECK
===================================================== */

function locationTextExists() {

    return Boolean(
        document.getElementById(
            "locationText"
        )
    );

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


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("issues")
                .select(
                    "id,issue_code,category,description,latitude,longitude,image_url,status,priority,department,created_at"
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );


        if (error) {

            throw error;

        }


        renderReports(
            data || []
        );


        updateStatistics(
            data || []
        );


    } catch (error) {

        console.error(
            "Load reports error:",
            error
        );


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
                    📭
                </div>

                <h3>
                    No reports yet
                </h3>

                <p>
                    No civic issues have been reported yet.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        "";


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


            const imageHTML =
                report.image_url

                    ? `

                        <div class="issue-image">

                            <img
                                src="${escapeHTML(
                                    report.image_url
                                )}"
                                alt="Civic issue"
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

                ${imageHTML}

                <div class="issue-content">

                    <h3>
                        ${escapeHTML(
                            report.category ||
                            "Civic Issue"
                        )}
                    </h3>

                    <p>
                        ${escapeHTML(
                            report.description ||
                            ""
                        )}
                    </p>

                    <p>
                        <strong>
                            ${escapeHTML(
                                report.issue_code ||
                                ""
                            )}
                        </strong>
                    </p>

                    <p>
                        🏛️
                        ${escapeHTML(
                            report.department ||
                            "Municipal Administration"
                        )}
                    </p>

                    <span class="status">
                        ${escapeHTML(
                            report.status ||
                            "Reported"
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
   CATEGORY ICON
===================================================== */

function getCategoryIcon(
    category
) {

    const icons = {

        Pothole:
            "🕳️",

        Garbage:
            "🗑️",

        Streetlight:
            "💡",

        "Street Light":
            "💡",

        Drainage:
            "🌊",

        "Road Damage":
            "🚧",

        Other:
            "📍"

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


    if (
        !toast ||
        !messageElement
    ) {

        alert(message);

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
        3500
    );

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )

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
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        addCitizenFields();


        const issueForm =
            document.getElementById(
                "issueForm"
            );


        if (issueForm) {

            issueForm.addEventListener(
                "submit",
                submitIssue
            );

        }

    }
);
