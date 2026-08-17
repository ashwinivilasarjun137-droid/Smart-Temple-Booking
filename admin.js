document.addEventListener(
    "DOMContentLoaded",
    loadDashboard
);


async function loadDashboard() {

    try {

        const templesResponse =
            await fetch("/api/events");

        const bookingsResponse =
            await fetch("/api/bookings");


        if (!templesResponse.ok ||
            !bookingsResponse.ok) {

            throw new Error(
                "Unable to load dashboard"
            );

        }


        const temples =
            await templesResponse.json();

        const bookings =
            await bookingsResponse.json();


        document.getElementById(
            "templeCount"
        ).textContent =
            temples.length;


        document.getElementById(
            "bookingCount"
        ).textContent =
            bookings.length;


        const visitorCount =
            bookings.reduce(
                (sum, booking) =>
                    sum +
                    Number(
                        booking.number_of_visitors || 0
                    ),
                0
            );


        document.getElementById(
            "visitorCount"
        ).textContent =
            visitorCount;


        const confirmed =
            bookings.filter(
                booking =>
                    booking.status ===
                    "Confirmed"
            ).length;


        document.getElementById(
            "confirmedCount"
        ).textContent =
            confirmed;


        displayBookings(
            bookings
        );


    } catch (error) {

        console.error(error);

        document.getElementById(
            "adminMessage"
        ).textContent =
            "❌ Unable to load dashboard.";

    }

}


function displayBookings(bookings) {

    const body =
        document.getElementById(
            "bookingBody"
        );


    body.innerHTML = "";


    if (!bookings.length) {

        body.innerHTML = `
            <tr>
                <td colspan="8">
                    No bookings found.
                </td>
            </tr>
        `;

        return;
    }


    bookings.forEach(
        booking => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${booking.id}
                </td>

                <td>
                    ${booking.booking_code || "-"}
                </td>

                <td>
                    ${booking.visitor_name}
                </td>

                <td>
                    ${booking.contact}
                </td>

                <td>
                    ${booking.number_of_visitors}
                </td>

                <td>
                    ${booking.selected_date}
                </td>

                <td>
                    ${booking.selected_session}
                </td>

                <td>
                    ${booking.status}
                </td>

            `;


            body.appendChild(row);

        }
    );

}