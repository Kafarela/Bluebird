import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import PDFDocument from "pdfkit";
import { hashPassword, normalizeEmail, verifyPassword } from "./_core/password";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

const locationSchema = z.object({
  city: z.string().trim().min(1, "City is required").max(120),
  state: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().min(1, "Country is required").max(120),
});

const bookingInput = z.object({
  bookingReference: z.string().trim().min(3).max(20).regex(/^[a-z0-9-]+$/i, "Use letters, numbers, or hyphens only"),
  travelerName: z.string().trim().min(1).max(180),
  travelerEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
  travelerPhone: z.string().trim().max(60).optional().or(z.literal("")),
  travelerType: z.enum(["adult", "kid", "teenager"]),
  travelerCount: z.coerce.number().int().min(1).max(99),
  seatNumber: z.string().trim().max(20).optional().or(z.literal("")),
  layoverHub: z.enum(["non_stop", "single_layover", "multi_stop"]),
  airlineName: z.string().trim().min(1).max(160),
  airlineLogoUrl: z.string().trim().max(700000).optional().or(z.literal("")),
  flightNumber: z.string().trim().min(2).max(20).regex(/^[a-z0-9-]+$/i, "Use letters, numbers, or hyphens only"),
  ticketType: z.enum(["one_way", "round_trip"]),
  flightClass: z.enum(["economy", "business", "first"]),
  departure: locationSchema,
  arrival: locationSchema,
  departureAirport: z.string().trim().min(1).max(160),
  departureTerminal: z.string().trim().max(120).optional().or(z.literal("")),
  arrivalAirport: z.string().trim().min(1).max(160),
  arrivalTerminal: z.string().trim().max(120).optional().or(z.literal("")),
  departureAt: z.coerce.date(),
  arrivalAt: z.coerce.date(),
  totalTravelTime: z.string().trim().min(1).max(80),
  totalMiles: z.coerce.number().int().min(0).max(999999),
  ticketStatus: z.enum(["confirmed", "pending", "cancelled"]),
  eTicketNumber: z.string().trim().min(3).max(40).regex(/^[a-z0-9]+$/i, "Use letters and numbers only"),
  bookingAt: z.coerce.date(),
  amountDue: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
  amountPaid: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
  paymentStatus: z.enum(["paid", "partially_paid", "unpaid"]),
  notes: z.string().max(2000).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.arrivalAt <= value.departureAt) {
    ctx.addIssue({ code: "custom", path: ["arrivalAt"], message: "Arrival must be after departure" });
  }
  const dueCents = Math.round(Number(value.amountDue) * 100);
  const paidCents = Math.round(Number(value.amountPaid) * 100);
  if (paidCents > dueCents) {
    ctx.addIssue({ code: "custom", path: ["amountPaid"], message: "Paid amount cannot exceed amount due" });
  }
  if (value.paymentStatus === "paid" && paidCents !== dueCents) {
    ctx.addIssue({ code: "custom", path: ["paymentStatus"], message: "Paid status requires the full amount to be paid" });
  }
  if (value.paymentStatus === "unpaid" && paidCents !== 0) {
    ctx.addIssue({ code: "custom", path: ["paymentStatus"], message: "Unpaid status requires an amount paid of 0.00" });
  }
  if (value.paymentStatus === "partially_paid" && (paidCents <= 0 || paidCents >= dueCents)) {
    ctx.addIssue({ code: "custom", path: ["paymentStatus"], message: "Partially paid status requires payment between 0.00 and the full amount" });
  }
});

function toInsertBooking(input: z.infer<typeof bookingInput>, createdBy: number) {
  return {
    bookingReference: input.bookingReference.toUpperCase().trim(),
    travelerName: input.travelerName,
    travelerEmail: input.travelerEmail || null,
    travelerPhone: input.travelerPhone || null,
    travelerType: input.travelerType,
    travelerCount: input.travelerCount,
    seatNumber: input.seatNumber || null,
    layoverHub: input.layoverHub,
    airlineName: input.airlineName,
    airlineLogoUrl: input.airlineLogoUrl || null,
    flightNumber: input.flightNumber.toUpperCase(),
    ticketType: input.ticketType,
    flightClass: input.flightClass,
    departureCity: input.departure.city,
    departureState: input.departure.state || null,
    departureCountry: input.departure.country,
    departureAirport: input.departureAirport,
    departureTerminal: input.departureTerminal || null,
    arrivalCity: input.arrival.city,
    arrivalState: input.arrival.state || null,
    arrivalCountry: input.arrival.country,
    arrivalAirport: input.arrivalAirport,
    arrivalTerminal: input.arrivalTerminal || null,
    departureAt: input.departureAt,
    arrivalAt: input.arrivalAt,
    totalTravelTime: input.totalTravelTime,
    totalMiles: input.totalMiles,
    ticketStatus: input.ticketStatus,
    eTicketNumber: input.eTicketNumber.toUpperCase(),
    bookingAt: input.bookingAt,
    amountDue: input.amountDue,
    amountPaid: input.amountPaid,
    paymentStatus: input.paymentStatus,
    notes: input.notes || null,
    createdBy,
  } as const;
}

function toBookingFields(input: z.infer<typeof bookingInput>) {
  const { createdBy: _createdBy, ...fields } = toInsertBooking(input, 0);
  return fields;
}

async function createTicketPdf(booking: Awaited<ReturnType<typeof db.getBookingById>>) {
  if (!booking) throw new Error("Booking not found");
  const doc = new PDFDocument({ size: "LETTER", margin: 46 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  doc.fontSize(22).fillColor("#0f2a52").text("BLUEBIRD AIRWAYS");
  doc.moveDown(.4).fontSize(10).fillColor("#66778f").text("CONFIRMED TRAVELER TICKET");
  doc.moveDown(1).fontSize(17).fillColor("#0f2a52").text(`${booking.departureCity}  →  ${booking.arrivalCity}`);
  doc.moveDown(.5).fontSize(10).fillColor("#3b4e68").text(`Booking reference: ${booking.bookingReference}`);
  doc.text(`Traveler: ${booking.travelerName}`);
  doc.text(`Airline: ${booking.airlineName || "Airline"} · ${booking.flightNumber || "Flight pending"}`);
  doc.text(`Departure: ${booking.departureAt.toLocaleString()} · ${booking.departureAirport || "Airport pending"}`);
  doc.text(`Arrival: ${booking.arrivalAt.toLocaleString()} · ${booking.arrivalAirport || "Airport pending"}`);
  doc.text(`Seat: ${booking.seatNumber || "Not assigned"} · E-ticket: ${booking.eTicketNumber || "—"}`);
  doc.text(`Payment: ${booking.paymentStatus} · Paid $${booking.amountPaid} · Unpaid $${Math.max(0, Number(booking.amountDue) - Number(booking.amountPaid)).toFixed(2)}`);
  doc.moveDown(1).fontSize(11).fillColor("#0f2a52").text("Airline rules & regulations");
  doc.moveDown(.4).fontSize(9).fillColor("#52617a").text("Plans can change. Airline fees may apply according to the airline's own policies. Tickets are nonrefundable if requirements are not met, nontransferable, and name changes are not allowed. Please read the rules carefully.", { width: 500 });
  doc.end();
  return done;
}

const authEmail = z.string().trim().email().max(320).transform(normalizeEmail);
const authPassword = z.string().min(8, "Password must be at least 8 characters").max(200);

async function startLocalSession(ctx: { req: any; res: any }, user: NonNullable<Awaited<ReturnType<typeof db.getUserByEmail>>>) {
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || user.email || "Bluebird traveler",
    expiresInMs: ONE_YEAR_MS,
  });
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  return user;
}

const flightSearchInput = z.object({
  from: z.string().trim().min(2).max(120),
  to: z.string().trim().min(2).max(120),
  date: z.string().trim().min(8).max(20),
  travelers: z.coerce.number().int().min(1).max(9).default(1),
});
const duffelSearchInput = z.object({
  origin: z.string().trim().min(3).max(120),
  destination: z.string().trim().min(3).max(120),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid departure date"),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid return date").optional().or(z.literal("")),
  passengers: z.coerce.number().int().min(1).max(9),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]),
  maxConnections: z.coerce.number().int().min(0).max(3),
});

const flightScheduleInput = z.object({
  airline: z.string().trim().min(1).max(160),
  flightNumber: z.string().trim().min(2).max(20).regex(/^[a-z0-9-]+$/i),
  fromCode: z.string().trim().min(2).max(8),
  toCode: z.string().trim().min(2).max(8),
  fromName: z.string().trim().min(1).max(160),
  toName: z.string().trim().min(1).max(160),
  departure: z.string().trim().min(1).max(20),
  arrival: z.string().trim().min(1).max(20),
  duration: z.string().trim().min(1).max(80),
  stops: z.string().trim().min(1).max(80),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price").or(z.literal("")),
  active: z.boolean(),
});

function toScheduleFields(input: z.infer<typeof flightScheduleInput>, createdBy?: number) {
  return {
    airline: input.airline, flightNumber: input.flightNumber.toUpperCase(),
    fromCode: input.fromCode.toUpperCase(), toCode: input.toCode.toUpperCase(),
    fromName: input.fromName, toName: input.toName, departure: input.departure,
    arrival: input.arrival, duration: input.duration, stops: input.stops,
    price: input.price || null, active: input.active ? 1 : 0,
    ...(createdBy ? { createdBy } : {}),
  };
}

const fallbackFlights = [
  { airline: "Bluebird Airways", flightNumber: "BB204", fromCode: "JFK", toCode: "LHR", fromName: "New York", toName: "London", departure: "08:10", arrival: "20:05", duration: "6h 55m", stops: "Non-stop", price: 737 },
  { airline: "British Airways", flightNumber: "BA178", fromCode: "JFK", toCode: "LHR", fromName: "New York", toName: "London", departure: "21:30", arrival: "09:25", duration: "6h 55m", stops: "Non-stop", price: 812 },
  { airline: "Air Canada", flightNumber: "AC872", fromCode: "YYZ", toCode: "CDG", fromName: "Toronto", toName: "Paris", departure: "18:40", arrival: "07:20", duration: "7h 40m", stops: "Non-stop", price: 812 },
  { airline: "Lufthansa", flightNumber: "LH463", fromCode: "MIA", toCode: "FRA", fromName: "Miami", toName: "Frankfurt", departure: "16:45", arrival: "07:10", duration: "9h 25m", stops: "Non-stop", price: 774 },
  { airline: "LATAM Airlines", flightNumber: "LA501", fromCode: "JFK", toCode: "SCL", fromName: "New York", toName: "Santiago", departure: "20:00", arrival: "07:35", duration: "10h 35m", stops: "Non-stop", price: 698 },
  { airline: "United Airlines", flightNumber: "UA78", fromCode: "LAX", toCode: "AMS", fromName: "Los Angeles", toName: "Amsterdam", departure: "16:15", arrival: "12:35", duration: "11h 20m", stops: "Single layover", price: 905 },
  { airline: "Air France", flightNumber: "AF65", fromCode: "LAX", toCode: "CDG", fromName: "Los Angeles", toName: "Paris", departure: "13:40", arrival: "09:15", duration: "10h 35m", stops: "Non-stop", price: 918 },
];

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    signup: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(120), email: authEmail, password: authPassword })).mutation(async ({ input, ctx }) => {
      const existing = await db.getUserByEmail(input.email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "An account with that email already exists. Please log in instead." });
      try {
        const user = await db.createLocalUser({ email: input.email, name: input.name, passwordHash: await hashPassword(input.password) });
        return startLocalSession(ctx, user);
      } catch (error) {
        if (String(error).toLowerCase().includes("duplicate") || String(error).toLowerCase().includes("unique")) {
          throw new TRPCError({ code: "CONFLICT", message: "An account with that email already exists. Please log in instead." });
        }
        throw error;
      }
    }),
    login: publicProcedure.input(z.object({ email: authEmail, password: z.string().min(1).max(200) })).mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      }
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
      return startLocalSession(ctx, { ...user, lastSignedIn: new Date() });
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  owner: router({
    status: publicProcedure.query(async () => ({ hasOwner: await db.hasAdmin() })),
    claim: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        const user = await db.claimOwner(ctx.user.openId);
        return { success: true as const, user };
      } catch (error) {
        throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Unable to claim owner access" });
      }
    }),
  }),
  booking: router({
    lookup: publicProcedure.input(z.object({ reference: z.string().trim().min(3).max(20) })).query(async ({ input }) => {
      const booking = await db.getBookingByReference(input.reference);
      return db.toPublicBooking(booking);
    }),
    adminList: adminProcedure.query(() => db.listBookings()),
    adminCreate: adminProcedure.input(bookingInput).mutation(async ({ input, ctx }) => {
      try {
        return await db.createBooking({ ...toBookingFields(input), createdBy: ctx.user.id });
      } catch (error) {
        if (String(error).toLowerCase().includes("duplicate")) {
          throw new TRPCError({ code: "CONFLICT", message: "That booking reference is already in use." });
        }
        throw error;
      }
    }),
    adminUpdate: adminProcedure.input(z.object({ id: z.number().int().positive(), data: bookingInput })).mutation(async ({ input }) => {
      try {
        return await db.updateBooking(input.id, toBookingFields(input.data));
      } catch (error) {
        if (String(error).toLowerCase().includes("duplicate")) {
          throw new TRPCError({ code: "CONFLICT", message: "That booking reference is already in use." });
        }
        throw error;
      }
    }),
    sendConfirmation: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const booking = await db.getBookingById(input.id);
      if (!booking?.travelerEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "Add a traveler email before sending a confirmation." });
      if (booking.paymentStatus !== "paid" || booking.ticketStatus !== "confirmed") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only paid and confirmed bookings can receive a ticket email." });
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Email sending is not configured yet. Add RESEND_API_KEY and EMAIL_FROM to the project environment." });
      const pdf = await createTicketPdf(booking);
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM || "Bluebird Airways <onboarding@resend.dev>", to: [booking.travelerEmail], subject: `Your Bluebird Airways ticket · ${booking.bookingReference}`, html: `<p>Hello ${booking.travelerName},</p><p>Your paid and confirmed Bluebird Airways booking <strong>${booking.bookingReference}</strong> is attached as a PDF ticket.</p><p>Departure: ${booking.departureCity} · Arrival: ${booking.arrivalCity}</p><p>Keep your booking reference nearby.</p>`, attachments: [{ filename: `bluebird-${booking.bookingReference}.pdf`, content: pdf.toString("base64") }] }) });
      if (!response.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: "The email provider could not send the booking confirmation." });
      return { sent: true as const, email: booking.travelerEmail };
    }),
  }),
  schedules: router({
    adminList: adminProcedure.query(() => db.listFlightSchedules()),
    adminCreate: adminProcedure.input(flightScheduleInput).mutation(({ input, ctx }) => db.createFlightSchedule({ ...toScheduleFields(input), createdBy: ctx.user.id })),
    adminUpdate: adminProcedure.input(z.object({ id: z.number().int().positive(), data: flightScheduleInput })).mutation(({ input }) => db.updateFlightSchedule(input.id, toScheduleFields(input.data))),
    adminDelete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.deleteFlightSchedule(input.id)),
  }),
  flights: router({
    search: publicProcedure.input(flightSearchInput).query(async ({ input }) => {
      const apiKey = process.env.AVIATIONSTACK_API_KEY;
      const from = input.from.toUpperCase();
      const to = input.to.toUpperCase();
      if (apiKey && /^[A-Z]{3}$/.test(from) && /^[A-Z]{3}$/.test(to)) {
        try {
          const response = await fetch(`https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(apiKey)}&dep_iata=${from}&arr_iata=${to}&flight_date=${encodeURIComponent(input.date)}&limit=20`);
          const payload = await response.json() as { data?: Array<any> };
          const live = (payload.data || []).map((flight) => ({
            airline: flight.airline?.name || "Airline",
            flightNumber: flight.flight?.iata || flight.flight?.number || "—",
            fromCode: flight.departure?.iata || from,
            toCode: flight.arrival?.iata || to,
            fromName: flight.departure?.airport || input.from,
            toName: flight.arrival?.airport || input.to,
            departure: flight.departure?.scheduled ? new Date(flight.departure.scheduled).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
            arrival: flight.arrival?.scheduled ? new Date(flight.arrival.scheduled).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
            duration: "Schedule available",
            stops: "Schedule",
            price: null,
            live: true,
          }));
          if (live.length) return { source: "live" as const, flights: live };
        } catch (error) { console.warn("[Flights] Live search unavailable, using schedule catalog", error); }
      }
      const savedSchedules = await db.searchFlightSchedules(input.from, input.to);
      const catalogFlights = savedSchedules.map((flight) => ({ ...flight, price: flight.price === null ? null : Number(flight.price), live: false }));
      const matches = catalogFlights.length ? catalogFlights : fallbackFlights.filter((flight) => `${flight.fromCode} ${flight.fromName}`.toLowerCase().includes(input.from.toLowerCase()) && `${flight.toCode} ${flight.toName}`.toLowerCase().includes(input.to.toLowerCase()));
      return { source: "schedule" as const, flights: (matches.length ? matches : fallbackFlights).map((flight) => ({ ...flight, live: false })) };
    }),
  }),
  duffel: router({
    search: publicProcedure.input(duffelSearchInput).query(async ({ input }) => {
      if (!ENV.duffelApiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Live flight availability is not configured yet. Add DUFFEL_API_KEY to the Railway service variables." });
      const origin = input.origin.trim().toUpperCase();
      const destination = input.destination.trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) throw new TRPCError({ code: "BAD_REQUEST", message: "Duffel needs a three-letter IATA airport or city code, such as LAX, JFK, or LON." });
      const slices = [{ origin, destination, departure_date: input.departureDate }, ...(input.returnDate ? [{ origin: destination, destination: origin, departure_date: input.returnDate }] : [])];
      const response = await fetch("https://api.duffel.com/air/offer_requests?return_offers=true&view=offers", {
        method: "POST",
        headers: { Authorization: `Bearer ${ENV.duffelApiKey}`, Accept: "application/json", "Accept-Encoding": "gzip", "Content-Type": "application/json", "Duffel-Version": "v2" },
        body: JSON.stringify({ data: { slices, passengers: Array.from({ length: input.passengers }, () => ({ type: "adult" })), cabin_class: input.cabinClass, max_connections: input.maxConnections, supplier_timeout: 10000 } }),
      });
      const payload = await response.json() as { data?: { id?: string; offers?: Array<any> }; errors?: Array<{ message?: string }> };
      if (!response.ok) throw new TRPCError({ code: response.status === 401 ? "UNAUTHORIZED" : "BAD_GATEWAY", message: payload.errors?.[0]?.message || "Duffel could not complete this availability search." });
      const offers = (payload.data?.offers || []).slice(0, 30).map((offer) => ({
        id: offer.id, totalAmount: offer.total_amount, totalCurrency: offer.total_currency, expiresAt: offer.expires_at, ownerName: offer.owner?.name || "Airline",
        slices: (offer.slices || []).map((slice: any) => ({ duration: slice.duration, segments: (slice.segments || []).map((segment: any) => ({ flightNumber: segment.marketing_carrier?.iata_code && segment.marketing_carrier_flight_number ? `${segment.marketing_carrier.iata_code}${segment.marketing_carrier_flight_number}` : "—", operatingCarrier: segment.operating_carrier?.name || segment.marketing_carrier?.name || "Airline", origin: segment.origin?.iata_code || "—", destination: segment.destination?.iata_code || "—", departureAt: segment.departing_at, arrivalAt: segment.arriving_at })) })),
      }));
      return { source: "duffel" as const, offerRequestId: payload.data?.id || null, offers };
    }),
  }),
});

export type AppRouter = typeof appRouter;
