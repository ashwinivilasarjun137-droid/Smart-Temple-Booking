const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// =====================================================
// HOME
// =====================================================

app.get("/api", (req, res) => {
    res.json({
        message: "Smart Temple Booking API",
        status: "Running"
    });
});


// =====================================================
// GET TEMPLES
// =====================================================

app.get("/api/events", async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("events")
            .select("*")
            .order("id");

        if (error) throw error;

        res.json(data || []);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Unable to load temples",
            error: error.message
        });
    }
});


// =====================================================
// GET DATES
// =====================================================

app.get("/api/dates", async (req, res) => {

    try {

        const eventId = Number(req.query.eventId);

        if (!eventId) {
            return res.status(400).json({
                message: "eventId is required"
            });
        }

        const { data, error } = await supabase
            .from("sessions")
            .select("session_date")
            .eq("event_id", eventId)
            .order("session_date");

        if (error) throw error;

        const dates = [
            ...new Set(
                (data || []).map(row => row.session_date)
            )
        ];

        res.json(dates);

    } catch (error) {

        res.status(500).json({
            message: "Unable to load dates",
            error: error.message
        });
    }
});


// =====================================================
// GET SESSIONS
// =====================================================

app.get("/api/sessions", async (req, res) => {

    try {

        const eventId = Number(req.query.eventId);
        const date = req.query.date;

        if (!eventId || !date) {
            return res.status(400).json({
                message: "eventId and date are required"
            });
        }

        const { data, error } = await supabase
            .from("sessions")
            .select("*")
            .eq("event_id", eventId)
            .eq("session_date", date)
            .order("id");

        if (error) throw error;

        const sessions = (data || []).map(session => {

            const available =
                session.capacity - session.booked;

            let crowdLevel = "LOW";

            if (available <= 10) {
                crowdLevel = "CRITICAL";
            } else if (
                session.booked >= session.capacity * 0.75
            ) {
                crowdLevel = "HIGH";
            } else if (
                session.booked >= session.capacity * 0.5
            ) {
                crowdLevel = "MODERATE";
            }

            return {
                ...session,
                availableSeats: available,
                crowdLevel
            };
        });

        res.json(sessions);

    } catch (error) {

        res.status(500).json({
            message: "Unable to load sessions",
            error: error.message
        });
    }
});


// =====================================================
// CREATE BOOKING
// =====================================================

app.post("/api/bookings", async (req, res) => {

    try {

        const {
            visitorName,
            contact,
            email,
            adults,
            children,
            seniorCitizens,
            sessionId,
            latitude,
            longitude
        } = req.body;

        const adultCount = Number(adults || 0);
        const childCount = Number(children || 0);
        const seniorCount = Number(seniorCitizens || 0);

        const totalVisitors =
            adultCount +
            childCount +
            seniorCount;


        if (!visitorName || !contact || !sessionId) {
            return res.status(400).json({
                message:
                    "Name, contact and session are required"
            });
        }


        if (totalVisitors <= 0) {
            return res.status(400).json({
                message:
                    "At least one visitor is required"
            });
        }


        if (!/^[0-9]{10}$/.test(contact)) {
            return res.status(400).json({
                message:
                    "Mobile number must contain 10 digits"
            });
        }


        const { data: session, error: sessionError } =
            await supabase
                .from("sessions")
                .select("*")
                .eq("id", Number(sessionId))
                .single();


        if (sessionError || !session) {
            return res.status(404).json({
                message: "Session not found"
            });
        }


        const available =
            session.capacity - session.booked;


        if (totalVisitors > available) {
            return res.status(400).json({
                message:
                    `Only ${available} seats are available`
            });
        }


        const bookingCode =
            "STM-" +
            Date.now().toString().slice(-8);


        const qrData = JSON.stringify({
            bookingCode,
            visitorName,
            date: session.session_date,
            session: session.session_time,
            visitors: totalVisitors
        });


        const { data: booking, error: bookingError } =
            await supabase
                .from("bookings")
                .insert({

                    booking_code: bookingCode,

                    visitor_name: visitorName,

                    contact,

                    email: email || null,

                    adults: adultCount,

                    children: childCount,

                    senior_citizens: seniorCount,

                    number_of_visitors: totalVisitors,

                    event_id: session.event_id,

                    session_id: session.id,

                    selected_date:
                        session.session_date,

                    selected_session:
                        session.session_time,

                    status: "Confirmed",

                    qr_data: qrData,

                    latitude:
                        latitude ?? null,

                    longitude:
                        longitude ?? null

                })
                .select()
                .single();


        if (bookingError) {
            throw bookingError;
        }


        const { error: updateError } =
            await supabase
                .from("sessions")
                .update({
                    booked:
                        session.booked +
                        totalVisitors
                })
                .eq("id", session.id);


        if (updateError) {
            throw updateError;
        }


        res.status(201).json({
            message: "Booking confirmed",
            booking
        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Unable to create booking",
            error: error.message
        });
    }
});


// =====================================================
// GET BOOKINGS
// =====================================================



app.get("/api/bookings", async (req, res) => {

    try {

        // Get bookings
        const { data: bookings, error: bookingError } =
            await supabase
                .from("bookings")
                .select("*")
                .order("id", {
                    ascending: false
                });

        if (bookingError) {
            throw bookingError;
        }


        // Get temples/events
        const { data: events, error: eventError } =
            await supabase
                .from("events")
                .select("*");

        if (eventError) {
            throw eventError;
        }


        // Add temple information to every booking
        const bookingsWithTemple =
            (bookings || []).map(booking => {

                const temple =
                    (events || []).find(
                        event =>
                            Number(event.id) ===
                            Number(booking.event_id)
                    );


                return {
                    ...booking,

                    temple_name:
                        temple?.name ||
                        "Temple information unavailable",

                    temple_location:
                        temple?.location ||
                        "Location unavailable"

                };

            });


        res.json(bookingsWithTemple);


    } catch (error) {

        console.error(error);

        res.status(500).json({

            message:
                "Unable to load bookings",

            error:
                error.message

        });

    }

});

// =====================================================
// GET SINGLE BOOKING
// =====================================================


app.get("/api/bookings/:id", async (req, res) => {

    try {

        const id =
            Number(req.params.id);


        if (!id) {

            return res.status(400).json({

                message:
                    "Invalid booking ID"

            });

        }


        // Get booking
        const { data: booking, error: bookingError } =
            await supabase
                .from("bookings")
                .select("*")
                .eq("id", id)
                .single();


        if (bookingError || !booking) {

            return res.status(404).json({

                message:
                    "Booking not found"

            });

        }


        // Get temple
        const { data: temple, error: templeError } =
            await supabase
                .from("events")
                .select("*")
                .eq("id", booking.event_id)
                .single();


        if (templeError || !temple) {

            return res.json({

                ...booking,

                temple_name:
                    "Temple information unavailable",

                temple_location:
                    "Location unavailable"

            });

        }


        res.json({

            ...booking,

            temple_name:
                temple.name,

            temple_location:
                temple.location

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({

            message:
                "Server error",

            error:
                error.message

        });

    }

});


// =====================================================
// UPDATE BOOKING
// =====================================================

app.put("/api/bookings/:id", async (req, res) => {

    try {

        const bookingId = Number(req.params.id);

        const {
            visitorName,
            contact,
            email,
            adults,
            children,
            seniorCitizens,
            sessionId
        } = req.body;


        if (!bookingId || !sessionId) {

            return res.status(400).json({
                message:
                    "Booking ID and session are required"
            });

        }


        const adultCount =
            Number(adults || 0);

        const childCount =
            Number(children || 0);

        const seniorCount =
            Number(seniorCitizens || 0);

        const totalVisitors =
            adultCount +
            childCount +
            seniorCount;


        if (totalVisitors <= 0) {

            return res.status(400).json({
                message:
                    "At least one visitor is required"
            });

        }


        if (
            contact &&
            !/^[0-9]{10}$/.test(contact)
        ) {

            return res.status(400).json({
                message:
                    "Mobile number must contain 10 digits"
            });

        }


        // Get existing booking

        const {
            data: oldBooking,
            error: oldBookingError
        } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", bookingId)
            .single();


        if (
            oldBookingError ||
            !oldBooking
        ) {

            return res.status(404).json({
                message:
                    "Booking not found"
            });

        }


        if (
            String(oldBooking.status)
                .toLowerCase() ===
            "cancelled"
        ) {

            return res.status(400).json({
                message:
                    "Cancelled booking cannot be modified"
            });

        }


        // Get new session

        const {
            data: newSession,
            error: sessionError
        } = await supabase
            .from("sessions")
            .select("*")
            .eq("id", Number(sessionId))
            .single();


        if (
            sessionError ||
            !newSession
        ) {

            return res.status(404).json({
                message:
                    "Session not found"
            });

        }


        // Available seats in new session

        const availableSeats =
            newSession.capacity -
            newSession.booked;


        // If same session, return old booking
        // visitors before checking availability

        if (
            Number(oldBooking.session_id) ===
            Number(newSession.id)
        ) {

            const availableForUpdate =
                availableSeats +
                Number(
                    oldBooking.number_of_visitors || 0
                );


            if (
                totalVisitors >
                availableForUpdate
            ) {

                return res.status(400).json({
                    message:
                        `Only ${availableForUpdate} seats are available`
                });

            }

        }

        else {

            if (
                totalVisitors >
                availableSeats
            ) {

                return res.status(400).json({
                    message:
                        `Only ${availableSeats} seats are available`
                });

            }

        }


        // Remove old visitors from old session

        await supabase
            .from("sessions")
            .update({
                booked:
                    Math.max(
                        0,
                        Number(
                            oldBooking.session_id ===
                            newSession.id
                                ? newSession.booked
                                : 0
                        )
                    )
            })
            .eq("id", oldBooking.session_id);


        // If changing session,
        // update both sessions correctly

        if (
            Number(oldBooking.session_id) !==
            Number(newSession.id)
        ) {

            const {
                data: oldSession
            } = await supabase
                .from("sessions")
                .select("booked")
                .eq(
                    "id",
                    oldBooking.session_id
                )
                .single();


            if (oldSession) {

                await supabase
                    .from("sessions")
                    .update({

                        booked:
                            Math.max(
                                0,
                                Number(
                                    oldSession.booked
                                ) -
                                Number(
                                    oldBooking
                                        .number_of_visitors
                                )
                            )

                    })
                    .eq(
                        "id",
                        oldBooking.session_id
                    );

            }


            await supabase
                .from("sessions")
                .update({

                    booked:
                        Number(
                            newSession.booked
                        ) +
                        totalVisitors

                })
                .eq(
                    "id",
                    newSession.id
                );

        }

        else {

            await supabase
                .from("sessions")
                .update({

                    booked:
                        Number(
                            newSession.booked
                        ) -
                        Number(
                            oldBooking
                                .number_of_visitors
                        ) +
                        totalVisitors

                })
                .eq(
                    "id",
                    newSession.id
                );

        }


        // Update booking

        const {
            data: updatedBooking,
            error: updateError
        } = await supabase
            .from("bookings")
            .update({

                visitor_name:
                    visitorName,

                contact:
                    contact,

                email:
                    email || null,

                adults:
                    adultCount,

                children:
                    childCount,

                senior_citizens:
                    seniorCount,

                number_of_visitors:
                    totalVisitors,

                session_id:
                    newSession.id,

                selected_date:
                    newSession.session_date,

                selected_session:
                    newSession.session_time,

                status:
                    "Confirmed"

            })
            .eq(
                "id",
                bookingId
            )
            .select()
            .single();


        if (updateError) {
            throw updateError;
        }


        res.json({

            message:
                "Booking updated successfully",

            booking:
                updatedBooking

        });

    }

    catch (error) {

        console.error(
            "UPDATE BOOKING ERROR:",
            error
        );

        res.status(500).json({

            message:
                "Unable to update booking",

            error:
                error.message

        });

    }

});


// =====================================================
// CANCEL BOOKING
// =====================================================

app.put("/api/bookings/:id/cancel", async (req, res) => {

    try {

        const id = Number(req.params.id);

        if (!id) {
            return res.status(400).json({
                message: "Invalid booking ID"
            });
        }


        // Find booking

        const { data: booking, error: bookingError } =
            await supabase
                .from("bookings")
                .select("*")
                .eq("id", id)
                .single();


        if (bookingError || !booking) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }


        // Check whether already cancelled

        if (
            booking.status &&
            booking.status.toLowerCase() === "cancelled"
        ) {

            return res.status(400).json({
                message: "Booking is already cancelled"
            });

        }


        // Get session

        const { data: session, error: sessionError } =
            await supabase
                .from("sessions")
                .select("*")
                .eq("id", booking.session_id)
                .single();


        if (sessionError || !session) {
            return res.status(404).json({
                message: "Session not found"
            });
        }


        // Update booking status

        const { data: updatedBooking, error: updateBookingError } =
            await supabase
                .from("bookings")
                .update({
                    status: "Cancelled"
                })
                .eq("id", id)
                .select()
                .single();


        if (updateBookingError) {
            throw updateBookingError;
        }


        // Return seats to session

        const newBookedCount =
            Math.max(
                0,
                session.booked -
                booking.number_of_visitors
            );


        const { error: sessionUpdateError } =
            await supabase
                .from("sessions")
                .update({
                    booked: newBookedCount
                })
                .eq("id", session.id);


        if (sessionUpdateError) {
            throw sessionUpdateError;
        }


        res.json({

            message: "Booking cancelled successfully",

            booking: updatedBooking

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Unable to cancel booking",

            error: error.message

        });

    }

});


// =====================================================
// ADMIN PAGE
// =====================================================

app.get("/admin", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "admin.html"
        )
    );
});


// =====================================================
// START SERVER
// =====================================================

app.get("/api/debug-events", async (req, res) => {
    try {
        const { data, error } = await supabase
        .from("bookings")
        .select(`
            *,
            events (
                name,
                location
            )
        `)
        .order("id", {
            ascending: false
        });
        res.json({
            count: data ? data.length : 0,
            data,
            error
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});