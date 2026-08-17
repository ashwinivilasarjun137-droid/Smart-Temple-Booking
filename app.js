// ============================================================
// SMART TEMPLE CROWD BOOKING SYSTEM
// FINAL FRONTEND JAVASCRIPT
// ============================================================


// ============================================================
// DOM ELEMENTS
// ============================================================

const eventSelect =
    document.getElementById("eventSelect");

const dateSelect =
    document.getElementById("dateSelect");

const sessionSelect =
    document.getElementById("sessionSelect");

const templeInfo =
    document.getElementById("templeInfo");

const sessionInfo =
    document.getElementById("sessionInfo");

const locationBtn =
    document.getElementById("locationBtn");

const locationStatus =
    document.getElementById("locationStatus");

const locationDetails =
    document.getElementById("locationDetails");

const routeStart =
    document.getElementById("routeStart");

const adults =
    document.getElementById("adults");

const children =
    document.getElementById("children");

const seniorCitizens =
    document.getElementById("seniorCitizens");

const visitorCount =
    document.getElementById("visitorCount");

const confirmBookingBtn =
    document.getElementById("confirmBookingBtn");

const bookingMessage =
    document.getElementById("bookingMessage");

const bookingResult =
    document.getElementById("bookingResult");

const bookingDetails =
    document.getElementById("bookingDetails");

const qrCode =
    document.getElementById("qrCode");

const loadBookingsBtn =
    document.getElementById("loadBookingsBtn");

const bookingsList =
    document.getElementById("bookingsList");

const bookingSearch =
    document.getElementById("bookingSearch");

const bookingDateFilter =
    document.getElementById("bookingDateFilter");

const bookingStatusFilter =
    document.getElementById("bookingStatusFilter");


// ============================================================
// MAP VARIABLES
// ============================================================

let map = null;

let userMarker = null;

let templeMarker = null;

let routeLine = null;

let visitorLatitude = null;

let visitorLongitude = null;

let selectedTemple = null;


// ============================================================
// FIXED COLLEGE LOCATION
// ============================================================

// Sahyadri College of Engineering & Management
// Adyar, Mangaluru

const COLLEGE_LOCATION = {

    latitude: 12.8650354,

    longitude: 74.9257386,

    name:
        "Sahyadri College of Engineering & Management"

};


// ============================================================
// START APPLICATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadTemples();

        initializeMap();

        updateVisitorCount();

    }
);


// ============================================================
// LOAD TEMPLES
// ============================================================

async function loadTemples() {

    try {

        eventSelect.innerHTML = `
            <option value="">
                -- Select Temple --
            </option>
        `;


        const response =
            await fetch("/api/events");


        if (!response.ok) {

            throw new Error(
                "Unable to load temples"
            );

        }


        const temples =
            await response.json();


        console.log(
            "Temples:",
            temples
        );


        if (!Array.isArray(temples) ||
            temples.length === 0) {

            eventSelect.innerHTML = `
                <option value="">
                    No temples found
                </option>
            `;

            return;

        }


        temples.forEach(
            function (temple) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    temple.id;


                option.textContent =
                    temple.name;


                eventSelect.appendChild(
                    option
                );

            }
        );


    }

    catch (error) {

        console.error(
            error
        );


        eventSelect.innerHTML = `
            <option value="">
                ❌ Unable to load temples
            </option>
        `;

    }

}


// ============================================================
// TEMPLE SELECTED
// ============================================================

eventSelect.addEventListener(
    "change",
    async function () {

        const eventId =
            eventSelect.value;


        resetDateAndSession();


        if (!eventId) {

            selectedTemple = null;

            return;

        }


        try {

            const response =
                await fetch("/api/events");


            const temples =
                await response.json();


            selectedTemple =
                temples.find(
                    temple =>
                        String(
                            temple.id
                        ) ===
                        String(eventId)
                );


            if (!selectedTemple) {

                return;

            }


            showTempleInfo(
                selectedTemple
            );


            await loadDates(
                eventId
            );


            // Update route if
            // college is selected

            if (
                routeStart.value ===
                "college"
            ) {

                createRoute(
                    COLLEGE_LOCATION.latitude,
                    COLLEGE_LOCATION.longitude,
                    selectedTemple
                );

            }


        }

        catch (error) {

            console.error(
                error
            );

        }

    }
);


// ============================================================
// SHOW TEMPLE INFORMATION
// ============================================================

function showTempleInfo(
    temple
) {

    templeInfo.innerHTML = `

        <div class="info-box">

            <h3>
                🛕 ${escapeHTML(
                    temple.name
                )}
            </h3>

            <p>
                📍 ${escapeHTML(
                    temple.location
                )}
            </p>

            <p>
                ${escapeHTML(
                    temple.description || ""
                )}
            </p>

        </div>

    `;

}


// =====================================================
// TEMPLE → LOAD DATES
// =====================================================

eventSelect.addEventListener("change", async function () {

    const eventId = this.value;

    dateSelect.innerHTML =
        '<option value="">Select Date</option>';

    sessionSelect.innerHTML =
        '<option value="">Select Session</option>';

    dateSelect.disabled = true;
    sessionSelect.disabled = true;

    if (!eventId) {
        return;
    }

    try {

        const response = await fetch(
            `/api/dates?eventId=${eventId}`
        );

        if (!response.ok) {
            throw new Error("Unable to load dates");
        }

        const dates = await response.json();

        console.log("DATES:", dates);

        dates.forEach(function (date) {

            const option =
                document.createElement("option");

            option.value = date;
            option.textContent = date;

            dateSelect.appendChild(option);
        });

        if (dates.length > 0) {
            dateSelect.disabled = false;
        }

    } catch (error) {

        console.error("Date loading error:", error);

        dateSelect.innerHTML =
            '<option value="">Unable to load dates</option>';
    }
});


// =====================================================
// DATE → LOAD SESSIONS
// =====================================================

dateSelect.addEventListener("change", async function () {

    const date = this.value;
    const eventId = eventSelect.value;

    sessionSelect.innerHTML =
        '<option value="">Select Session</option>';

    sessionSelect.disabled = true;

    if (!eventId || !date) {
        return;
    }

    try {

        const response = await fetch(
            `/api/sessions?eventId=${eventId}&date=${date}`
        );

        if (!response.ok) {
            throw new Error("Unable to load sessions");
        }

        const sessions = await response.json();

        console.log("SESSIONS:", sessions);

        sessions.forEach(function (session) {

            const option =
                document.createElement("option");

            option.value = session.id;

            option.textContent =
                `${session.session_time} — ${session.availableSeats ?? (session.capacity - session.booked)} seats available`;

            sessionSelect.appendChild(option);
        });

        if (sessions.length > 0) {
            sessionSelect.disabled = false;
        }

    } catch (error) {

        console.error("Session loading error:", error);

        sessionSelect.innerHTML =
            '<option value="">Unable to load sessions</option>';
    }
});


// ============================================================
// SESSION SELECTED
// ============================================================

sessionSelect.addEventListener(
    "change",
    async function () {

        const sessionId =
            sessionSelect.value;


        if (!sessionId) {

            sessionInfo.innerHTML = "";

            return;

        }


        try {

            const response =
                await fetch(
                    `/api/sessions?eventId=${eventSelect.value}&date=${dateSelect.value}`
                );


            const sessions =
                await response.json();


            const session =
                sessions.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(sessionId)
                );


            if (!session) {

                return;

            }


            displaySessionInfo(
                session
            );

        }

        catch (error) {

            console.error(
                error
            );

        }

    }
);


// ============================================================
// SESSION INFORMATION
// ============================================================

function displaySessionInfo(
    session
) {

    let crowdClass =
        "low";


    if (
        session.crowdLevel ===
        "MODERATE"
    ) {

        crowdClass =
            "moderate";

    }


    if (
        session.crowdLevel ===
        "HIGH"
    ) {

        crowdClass =
            "high";

    }


    if (
        session.crowdLevel ===
        "CRITICAL"
    ) {

        crowdClass =
            "critical";

    }


    sessionInfo.innerHTML = `

        <div class="session-box">

            <h3>
                ⏰ ${escapeHTML(
                    session.session_time
                )}
            </h3>

            <p>
                Capacity:
                <strong>
                    ${session.capacity}
                </strong>
            </p>

            <p>
                Booked:
                <strong>
                    ${session.booked}
                </strong>
            </p>

            <p>
                Available:
                <strong>
                    ${session.availableSeats}
                </strong>
            </p>

            <p>
                Crowd Level:
                <strong class="${crowdClass}">
                    ${session.crowdLevel}
                </strong>
            </p>

        </div>

    `;

}


// ============================================================
// VISITOR COUNT
// ============================================================

adults.addEventListener(
    "input",
    updateVisitorCount
);

children.addEventListener(
    "input",
    updateVisitorCount
);

seniorCitizens.addEventListener(
    "input",
    updateVisitorCount
);


function updateVisitorCount() {

    const total =
        getVisitorCount();


    visitorCount.innerHTML = `

        Total Visitors:
        <strong>
            ${total}
        </strong>

    `;

}


function getVisitorCount() {

    return (

        Number(adults.value || 0) +

        Number(children.value || 0) +

        Number(
            seniorCitizens.value || 0
        )

    );

}


// ============================================================
// INITIALIZE MAP
// ============================================================

function initializeMap() {

    map =
        L.map("map");


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {

            attribution:
                "&copy; OpenStreetMap contributors"

        }
    ).addTo(map);


    map.setView(
        [
            COLLEGE_LOCATION.latitude,
            COLLEGE_LOCATION.longitude
        ],
        11
    );

}


// ============================================================
// ROUTE START CHANGED
// ============================================================

routeStart.addEventListener(
    "change",
    async function () {

        if (!selectedTemple) {

            locationStatus.textContent =
                "⚠️ Please select a temple first.";

            return;

        }


        if (
            routeStart.value ===
            "college"
        ) {

            visitorLatitude =
                null;

            visitorLongitude =
                null;


            locationStatus.textContent =
                "🏫 Route starts from Sahyadri College.";


            createRoute(
                COLLEGE_LOCATION.latitude,
                COLLEGE_LOCATION.longitude,
                selectedTemple
            );


        }

        else {

            locationStatus.textContent =
                "📍 Click 'Get My Current Location'.";

        }

    }
);


// ============================================================
// GET CURRENT LOCATION
// ============================================================

locationBtn.addEventListener(
    "click",
    function () {

        if (!selectedTemple) {

            locationStatus.textContent =
                "⚠️ Please select a temple first.";

            return;

        }


        if (!navigator.geolocation) {

            locationStatus.textContent =
                "❌ Geolocation is not supported.";

            return;

        }


        locationStatus.textContent =
            "📍 Detecting your location...";


        locationBtn.disabled =
            true;


        navigator.geolocation.getCurrentPosition(

            handleLocationSuccess,

            handleLocationError,

            {

                enableHighAccuracy: true,

                timeout: 20000,

                maximumAge: 0

            }

        );

    }
);


// ============================================================
// LOCATION SUCCESS
// ============================================================

function handleLocationSuccess(
    position
) {

    visitorLatitude =
        position.coords.latitude;


    visitorLongitude =
        position.coords.longitude;


    const accuracy =
        position.coords.accuracy;


    locationStatus.textContent =
        "✅ Current GPS location detected.";


    locationDetails.innerHTML = `

        <div class="info-box">

            <p>
                📍 Your Current Location
            </p>

            <p>
                Latitude:
                <strong>
                    ${visitorLatitude.toFixed(6)}
                </strong>
            </p>

            <p>
                Longitude:
                <strong>
                    ${visitorLongitude.toFixed(6)}
                </strong>
            </p>

            <p>
                GPS Accuracy:
                <strong>
                    ±${Math.round(
                        accuracy
                    )} metres
                </strong>
            </p>

        </div>

    `;


    routeStart.value =
        "gps";


    createRoute(
        visitorLatitude,
        visitorLongitude,
        selectedTemple
    );


    locationBtn.disabled =
        false;

}


// ============================================================
// LOCATION ERROR
// ============================================================

function handleLocationError(
    error
) {

    locationBtn.disabled =
        false;


    console.error(
        "GPS error:",
        error
    );


    if (error.code === 1) {

        locationStatus.textContent =
            "❌ Location permission denied.";

    }

    else if (error.code === 2) {

        locationStatus.textContent =
            "❌ Position unavailable.";

    }

    else if (error.code === 3) {

        locationStatus.textContent =
            "❌ GPS request timed out.";

    }

    else {

        locationStatus.textContent =
            "❌ Unable to determine location.";

    }

}


// ============================================================
// CREATE ROAD ROUTE
// ============================================================

async function createRoute(
    startLatitude,
    startLongitude,
    temple
) {

    if (!map) {

        initializeMap();

    }


    const templeLatitude =
        Number(
            temple.latitude
        );


    const templeLongitude =
        Number(
            temple.longitude
        );


    if (
        !Number.isFinite(
            templeLatitude
        ) ||
        !Number.isFinite(
            templeLongitude
        )
    ) {

        locationStatus.textContent =
            "❌ Temple coordinates are invalid.";

        return;

    }


    // --------------------------------------------------------
    // REMOVE OLD MARKERS
    // --------------------------------------------------------

    if (userMarker) {

        map.removeLayer(
            userMarker
        );

        userMarker = null;

    }


    if (templeMarker) {

        map.removeLayer(
            templeMarker
        );

        templeMarker = null;

    }


    if (routeLine) {

        map.removeLayer(
            routeLine
        );

        routeLine = null;

    }


    const start =
        [
            startLatitude,
            startLongitude
        ];


    const destination =
        [
            templeLatitude,
            templeLongitude
        ];


    // --------------------------------------------------------
    // MARKERS
    // --------------------------------------------------------

    userMarker =
        L.marker(
            start
        )
        .addTo(map)
        .bindPopup(
            routeStart.value === "gps"
                ? "📍 Your Current Location"
                : "🏫 Sahyadri College"
        );


    templeMarker =
        L.marker(
            destination
        )
        .addTo(map)
        .bindPopup(
            `🛕 ${temple.name}`
        );


    // --------------------------------------------------------
    // TEMPORARY STRAIGHT LINE
    // --------------------------------------------------------

    routeLine =
        L.polyline(
            [
                start,
                destination
            ],
            {
                weight: 4,
                dashArray: "10,10"
            }
        ).addTo(map);


    map.fitBounds(
        [
            start,
            destination
        ],
        {
            padding: [
                40,
                40
            ]
        }
    );


    locationStatus.textContent =
        "🗺️ Calculating road route...";


    // --------------------------------------------------------
    // OSRM ROUTE
    // --------------------------------------------------------

    try {

        const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${startLongitude},${startLatitude};` +
            `${templeLongitude},${templeLatitude}` +
            `?overview=full&geometries=geojson`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Routing service unavailable"
            );

        }


        const data =
            await response.json();


        if (
            data.code !==
            "Ok" ||
            !data.routes ||
            data.routes.length === 0
        ) {

            throw new Error(
                "No route found"
            );

        }


        const route =
            data.routes[0];


        // ----------------------------------------------------
        // REMOVE STRAIGHT LINE
        // ----------------------------------------------------

        if (routeLine) {

            map.removeLayer(
                routeLine
            );

        }


        // ----------------------------------------------------
        // ROAD ROUTE
        // ----------------------------------------------------

        routeLine =
            L.geoJSON(
                route.geometry,
                {

                    style: {

                        weight: 6

                    }

                }
            ).addTo(map);


        map.fitBounds(
            routeLine.getBounds(),
            {
                padding: [
                    40,
                    40
                ]
            }
        );


        const distanceKm =
            route.distance /
            1000;


        const minutes =
            Math.round(
                route.duration /
                60
            );


        locationStatus.textContent =
            "✅ Road route found.";


        locationDetails.innerHTML = `

            <div class="info-box">

                <h3>
                    🗺️ Route Information
                </h3>

                <p>
                    <strong>
                        From:
                    </strong>
                    ${
                        routeStart.value === "gps"
                        ? "Your Current Location"
                        : "Sahyadri College of Engineering & Management"
                    }
                </p>

                <p>
                    <strong>
                        To:
                    </strong>
                    ${escapeHTML(
                        temple.name
                    )}
                </p>

                <p>
                    📏 Road Distance:
                    <strong>
                        ${distanceKm.toFixed(2)}
                        km
                    </strong>
                </p>

                <p>
                    ⏱️ Estimated Travel Time:
                    <strong>
                        ${formatTravelTime(
                            minutes
                        )}
                    </strong>
                </p>

            </div>

        `;

    }

    catch (error) {

        console.error(
            "Routing error:",
            error
        );


        locationStatus.textContent =
            "⚠️ Road routing unavailable. Showing direct map line.";

    }

}


// ============================================================
// CONFIRM BOOKING
// ============================================================

confirmBookingBtn.addEventListener(
    "click",
    async function () {

        bookingMessage.innerHTML = "";


        const visitorName =
            document.getElementById(
                "visitorName"
            ).value.trim();


        const contact =
            document.getElementById(
                "contact"
            ).value.trim();


        const email =
            document.getElementById(
                "email"
            ).value.trim();


        const sessionId =
            sessionSelect.value;


        const totalVisitors =
            getVisitorCount();


// ----------------------------------------------------
// VALIDATION
// ----------------------------------------------------

        if (!eventSelect.value) {

            showError(
                "Please select a temple."
            );

            return;

        }


        if (!dateSelect.value) {

            showError(
                "Please select a date."
            );

            return;

        }


        if (!sessionId) {

            showError(
                "Please select a session."
            );

            return;

        }


        if (!visitorName) {

            showError(
                "Please enter visitor name."
            );

            return;

        }

        if (!/^[0-9]{10}$/.test(contact)) {

            showError(
                "Please enter a valid 10 digit contact number."
            );

            return;

        }


        if (totalVisitors <= 0) {

            showError(
                "At least one visitor is required."
            );

            return;

        }


        confirmBookingBtn.disabled =
            true;


        confirmBookingBtn.textContent =
            "Processing...";


        try {

            const response =
                await fetch(
                    "/api/bookings",
                    {

                        method:
                            "POST",

                        headers:
                            {
                                "Content-Type":
                                    "application/json"
                            },

                        body:
                            JSON.stringify({

                                visitorName,

                                contact,

                                email,

                                adults:
                                    Number(
                                        adults.value
                                    ),

                                children:
                                    Number(
                                        children.value
                                    ),

                                seniorCitizens:
                                    Number(
                                        seniorCitizens.value
                                    ),

                                sessionId,

                                latitude:
                                    visitorLatitude,

                                longitude:
                                    visitorLongitude

                            })

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Booking failed"
                );

            }


            showBooking(
                data.booking
            );


        }

        catch (error) {

            console.error(
                error
            );


            showError(
                error.message
            );

        }

        finally {

            confirmBookingBtn.disabled =
                false;


            confirmBookingBtn.textContent =
                "🎟️ Confirm Booking";

        }

    }
);


// ============================================================
// SHOW BOOKING
// ============================================================

function showBooking(
    booking
) {

    bookingResult.style.display =
        "block";


    bookingDetails.innerHTML = `

        <div class="booking-card">

            <p>
                <strong>
                    Booking ID:
                </strong>
                ${booking.id}
            </p>

            <p>
                <strong>
                    Booking Code:
                </strong>
                ${escapeHTML(
                    booking.booking_code
                )}
            </p>

            <p>
                <strong>
                    Visitor:
                </strong>
                ${escapeHTML(
                    booking.visitor_name
                )}
            </p>

            <p>
                <strong>
                    Date:
                </strong>
                ${booking.selected_date}
            </p>

            <p>
                <strong>
                    Session:
                </strong>
                ${escapeHTML(
                    booking.selected_session
                )}
            </p>

            <p>
                <strong>
                    Visitors:
                </strong>
                ${booking.number_of_visitors}
            </p>

            <p>
                <strong>
                    Status:
                </strong>
                ${booking.status}
            </p>

        </div>

    `;


    qrCode.innerHTML = "";


    new QRCode(
        qrCode,
        {

            text:
                booking.qr_data,

            width:
                180,

            height:
                180

        }
    );


    bookingResult.scrollIntoView(
        {
            behavior:
                "smooth"
        }
    );

}


// ============================================================
// ERROR MESSAGE
// ============================================================

function showError(
    message
) {

    bookingMessage.innerHTML = `

        <div class="error-box">

            ❌ ${escapeHTML(
                message
            )}

        </div>

    `;

}


// ============================================================
// RESET
// ============================================================

function resetDateAndSession() {

    dateSelect.innerHTML = `
        <option value="">
            -- Select Date --
        </option>
    `;


    sessionSelect.innerHTML = `
        <option value="">
            -- Select Session --
        </option>
    `;


    dateSelect.disabled =
        true;


    sessionSelect.disabled =
        true;


    templeInfo.innerHTML = "";

    sessionInfo.innerHTML = "";

}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(
    date
) {

    const d =
        new Date(
            date + "T00:00:00"
        );


    return d.toLocaleDateString(
        "en-IN",
        {

            weekday:
                "long",

            day:
                "numeric",

            month:
                "long",

            year:
                "numeric"

        }
    );

}


// ============================================================
// FORMAT TRAVEL TIME
// ============================================================

function formatTravelTime(
    minutes
) {

    if (minutes < 60) {

        return `${minutes} minutes`;

    }


    const hours =
        Math.floor(
            minutes / 60
        );


    const remaining =
        minutes % 60;


    if (remaining === 0) {

        return `${hours} hour${
            hours > 1 ? "s" : ""
        }`;

    }


    return `${hours} hour${
        hours > 1 ? "s" : ""
    } ${remaining} minutes`;

}


// ============================================================
// BASIC HTML ESCAPING
// ============================================================

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


// ============================================================
// VIEW BOOKING DETAILS
// ============================================================

async function viewBookingDetails(bookingId) {

    try {

        const response =
            await fetch(`/api/bookings/${bookingId}`);

        if (!response.ok) {
            throw new Error("Booking not found");
        }

        const booking =
            await response.json();

        bookingResult.style.display = "block";

        bookingDetails.innerHTML = `

            <div class="info-box">

                <h3>🎫 Booking Details</h3>

                <p>
                    <strong>Booking ID:</strong>
                    ${escapeHTML(booking.booking_code)}
                </p>

                <p>
                    <strong>🛕 Temple:</strong>
                    ${escapeHTML(
                        booking.temple_name || "Temple information unavailable"
                    )}
                </p>

                <p>
                    <strong>📍 Location:</strong>
                    ${escapeHTML(
                        booking.temple_location || "Location unavailable"
                 )}
                </p>

                <p>
                    <strong>Visitor Name:</strong>
                    ${escapeHTML(booking.visitor_name)}
                </p>

                <p>
                    <strong>Contact:</strong>
                    ${escapeHTML(booking.contact)}
                </p>

                <p>
                    <strong>Email:</strong>
                    ${escapeHTML(
                        booking.email || "Not provided"
                    )}
                </p>

                <p>
                    <strong>Date:</strong>
                    ${escapeHTML(booking.selected_date)}
                </p>

                <p>
                    <strong>Session:</strong>
                    ${escapeHTML(booking.selected_session)}
                </p>

                <p>
                    <strong>Adults:</strong>
                    ${booking.adults}
                </p>

                <p>
                    <strong>Children:</strong>
                    ${booking.children}
                </p>

                <p>
                    <strong>Senior Citizens:</strong>
                    ${booking.senior_citizens}
                </p>

                <p>
                    <strong>Total Visitors:</strong>
                    ${booking.number_of_visitors}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${escapeHTML(booking.status)}
                </p>

            </div>

        `;

        bookingResult.scrollIntoView({
            behavior: "smooth"
        });

    }

    catch (error) {

        console.error(
            "Booking details error:",
            error
        );

        alert(
            "❌ Unable to load booking details."
        );

    }

}
// ============================================================
// CANCEL BOOKING
// ============================================================

async function cancelBooking(bookingId) {

    const confirmed =
        confirm(
            "Are you sure you want to cancel this booking?"
        );

    if (!confirmed) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/bookings/${bookingId}/cancel`,
                {
                    method: "PUT"
                }
            );

        const result =
            await response.json();

        if (!response.ok) {

            alert(
                result.message ||
                "Unable to cancel booking"
            );

            return;
        }

        alert(
            "✅ Booking cancelled successfully!"
        );

        await loadBookings();

    }

    catch (error) {

        console.error(
            "Cancel booking error:",
            error
        );

        alert(
            "❌ Unable to cancel booking."
        );

    }

}

// ============================================================
// MODIFY BOOKING
// ============================================================

async function modifyBooking(bookingId) {

    try {

        const response =
            await fetch(`/api/bookings/${bookingId}`);

        if (!response.ok) {
            throw new Error("Booking not found");
        }

        const booking =
            await response.json();

        // Show booking form section
        bookingResult.style.display = "block";

        bookingDetails.innerHTML = `

            <div class="info-box">

                <h3>✏️ Modify Booking</h3>

                <p>
                    <strong>Booking ID:</strong>
                    ${escapeHTML(booking.booking_code)}
                </p>

                <p>
                    <strong>🛕 Temple:</strong>
                    ${escapeHTML(
                        booking.temple_name
                    )}
                </p>

                <label>
                    Visitor Name
                </label>

                <input
                    type="text"
                    id="modifyName"
                    value="${escapeHTML(
                        booking.visitor_name
                    )}"
                >

                <label>
                    Contact
                </label>

                <input
                    type="text"
                    id="modifyContact"
                    value="${escapeHTML(
                        booking.contact
                    )}"
                    maxlength="10"
                >

                <label>
                    Adults
                </label>

                <input
                    type="number"
                    id="modifyAdults"
                    min="0"
                    value="${booking.adults}"
                >

                <label>
                    Children
                </label>

                <input
                    type="number"
                    id="modifyChildren"
                    min="0"
                    value="${booking.children}"
                >

                <label>
                    Senior Citizens
                </label>

                <input
                    type="number"
                    id="modifySenior"
                    min="0"
                    value="${booking.senior_citizens}"
                >

                <button
                    type="button"
                    onclick="saveModifiedBooking(${booking.id},${booking.session_id})"
                >
                    💾 Save Changes
                </button>

            </div>

        `;

        bookingResult.scrollIntoView({
            behavior: "smooth"
        });

    }

    catch (error) {

        console.error(error);

        alert(
            "❌ Unable to load booking."
        );

    }

}

// ============================================================
// SAVE MODIFIED BOOKING
// ============================================================

async function saveModifiedBooking(bookingId,sessionId) {

    const visitorName =
        document.getElementById("modifyName").value.trim();

    const contact =
        document.getElementById("modifyContact").value.trim();

    const adults =
        Number(
            document.getElementById("modifyAdults").value || 0
        );

    const children =
        Number(
            document.getElementById("modifyChildren").value || 0
        );

    const seniorCitizens =
        Number(
            document.getElementById("modifySenior").value || 0
        );

    const totalVisitors =
        adults +
        children +
        seniorCitizens;


    if (!visitorName) {

        alert("Please enter visitor name.");

        return;
    }


    if (!/^[0-9]{10}$/.test(contact)) {

        alert(
            "Mobile number must contain 10 digits."
        );

        return;
    }


    if (totalVisitors <= 0) {

        alert(
            "At least one visitor is required."
        );

        return;
    }


    try {

        const response =
            await fetch(
                `/api/bookings/${bookingId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        bookingId: bookingId,
                        sessionId: sessionId,

                        visitorName,
                        contact,
                        adults,
                        children,
                        seniorCitizens

                    })

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            alert(
                result.message ||
                "Unable to modify booking."
            );

            return;
        }


        alert(
            "✅ Booking modified successfully!"
        );


        // Reload bookings
        await loadBookings();

    }

    catch (error) {

        console.error(
            "Modify booking error:",
            error
        );

        alert(
            "❌ Unable to modify booking."
        );

    }

}







       if (loadBookingsBtn) {

    loadBookingsBtn.addEventListener("click", function (event) {

        event.preventDefault();

        // Load the bookings
        loadBookings();

        // Scroll after clicking the button
        const myBookingsSection =
            document.getElementById("myBookingsSection");

        if (myBookingsSection) {

            setTimeout(function () {

                myBookingsSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }, 100);

        }

    });

}

// ============================================================
// LOAD MY BOOKINGS
// ============================================================

async function loadBookings(searchValue = "") {

    if (!bookingsList) {

        console.error(
            "bookingsList element not found"
        );

        return;

    }

    bookingsList.innerHTML =
        "<p>⏳ Loading bookings...</p>";

    try {

        const response =
            await fetch("/api/bookings", {
                method: "GET",
                cache: "no-store"
            });

        if (!response.ok) {

            throw new Error(
                "Unable to load bookings"
            );

        }

        const bookings =
            await response.json();

        console.log(
            "BOOKINGS:",
            bookings
        );

        // Filter bookings using search box
        let filteredBookings = bookings;

        if (searchValue) {

            filteredBookings =
                bookings.filter(function (booking) {

                    return (
                        String(booking.booking_code || "")
                            .toLowerCase()
                            .includes(searchValue) ||

                        String(booking.contact || "")
                            .toLowerCase()
                            .includes(searchValue) ||

                        String(booking.visitor_name || "")
                            .toLowerCase()
                            .includes(searchValue)
                    );

                });

        }


        // Display bookings
        if (!Array.isArray(filteredBookings) ||
            bookings.length === 0) {

            bookingsList.innerHTML = `
                <div class="booking-empty">
                    📭 No bookings found.
                </div>
            `;

        } else {

            bookingsList.innerHTML = "";

            filteredBookings.forEach(function (booking) {

                const card =
                    document.createElement("div");

                card.className =
                    "booking-card";

                card.innerHTML = `

                    <div class="booking-header">

                        <h3>
                            🎟️ Booking Details
                        </h3>

                        <span class="booking-status">
                            ${escapeHTML(
                                booking.status || "Unknown"
                            )}
                        </span>

                    </div>

                    <div class="booking-grid">

                        <div class="booking-item">
                            <span>🎫 Booking ID</span>
                            <strong>
                                ${escapeHTML(
                                    booking.booking_code || "-"
                                )}
                            </strong>
                        </div>

                        <div class="booking-item">
                            <span>🛕 Temple</span>
                            <strong>
                                ${escapeHTML(
                                    booking.temple_name || "-"
                                )}
                            </strong>
                        </div>

                        <div class="booking-item">
                            <span>📍 Location</span>
                            <strong>
                                ${escapeHTML(
                                    booking.temple_location || "-"
                                )}
                            </strong>
                        </div>

                        <div class="booking-item">
                            <span>👤 Visitor Name</span>
                            <strong>
                                ${escapeHTML(
                                    booking.visitor_name || "-"
                                )}
                            </strong>
                        </div>

                        <div class="booking-item">
                            <span>📱 Contact</span>
                            <strong>
                                ${escapeHTML(
                                    booking.contact || "-"
                                )}
                            </strong>
                        </div>

                        <div class="booking-item">
                            <span>📧 Email</span>
                            <strong>
                                ${escapeHTML(
                                    booking.email || "-"
                                )}
                            </strong>
                        </div>

                        <div class="booking-item">
                            <span>📅 Date</span>
                            <strong>
                                ${escapeHTML(
                                    booking.selected_date || "-"
                                )}
                            </strong>
                        </div>

                        <div class="booking-item">
                            <span>⏰ Session</span>
                            <strong>
                                ${escapeHTML(
                                    booking.selected_session || "-"
                                )}
                            </strong>
                        </div>

                        <div class="booking-item">
                            <span>👥 Total Visitors</span>
                            <strong>
                                ${booking.number_of_visitors || 0}
                            </strong>
                        </div>

                    </div>

                    <div class="booking-actions">

                        <button
                            type="button"
                            onclick="viewBookingDetails(${booking.id})"
                        >
                            👁️ View Details
                        </button>

                        ${
                            String(booking.status).toLowerCase() !== "cancelled"
                            ?
                            `
                            <button
                                type="button"
                                onclick="modifyBooking(${booking.id})"
                            >
                                ✏️ Modify Booking
                            </button>

                            <button
                                type="button"
                                onclick="cancelBooking(${booking.id})"
                            >
                                ❌ Cancel Booking
                            </button>
                            `
                            :
                            ""
                        }

                    </div>

                `;

                bookingsList.appendChild(card);

            });

        }


        // Scroll AFTER bookings are displayed

        const myBookingsSection =
            document.getElementById(
                "myBookingsSection"
            );

        if (myBookingsSection) {

            setTimeout(function () {

                myBookingsSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }, 200);

        }

    }

    catch (error) {

        console.error(
            "Booking loading error:",
            error
        );

        bookingsList.innerHTML = `
            <div class="booking-error">
                ❌ Unable to load bookings.
            </div>
        `;

    }

}

function viewMyBookings() {

    console.log("View My Bookings clicked");

    // Get search value
    const searchValue =
        bookingSearch.value.trim().toLowerCase();

    // Load all bookings first
    loadBookings(searchValue);

    // Scroll to My Bookings
    const section =
        document.getElementById("myBookingsSection");

    if (section) {

        setTimeout(function () {

            section.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }, 300);

    }

}