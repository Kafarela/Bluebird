import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "mail.inbox.eu";
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "booking.bluebirdairways@inbox.eu";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;
const BOOKING_REQUEST_RECIPIENT = process.env.BOOKING_REQUEST_RECIPIENT || "love4rela@gmail.com";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

function requireSmtpPassword() {
  if (!SMTP_PASSWORD) throw new Error("SMTP_PASSWORD is not configured");
}

function createTransport() {
  requireSmtpPassword();
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

export type BookingRequestEmailData = {
  requestReference: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  passengers: Array<{ fullName: string; gender: string; type: string }>;
  route: {
    origin: string;
    originLabel?: string;
    destination: string;
    destinationLabel?: string;
    departureDate: string;
    returnDate: string | null;
    passengerCount: number;
    cabinClass: string;
  };
  selectedOffer: {
    airlineName: string;
    totalAmount: string;
    totalCurrency: string;
    slices: Array<{ duration: string | null; segments: Array<{ origin: string; destination: string; departureAt: string; arrivalAt: string; operatingCarrier: string; flightNumber: string }> }>;
  };
};

function bookingRequestText(data: BookingRequestEmailData) {
  const passengers = data.passengers.map((passenger, index) => `Traveler ${index + 1}: ${passenger.fullName} | Gender: ${passenger.gender} | Type: ${passenger.type}`).join("\n");
  const itinerary = data.selectedOffer.slices.flatMap((slice, index) => [
    `${index === 0 ? "Outbound" : "Return"} itinerary${slice.duration ? ` (${slice.duration})` : ""}:`,
    ...slice.segments.map(segment => `- ${segment.origin} to ${segment.destination} | ${segment.operatingCarrier} ${segment.flightNumber} | ${segment.departureAt} to ${segment.arrivalAt}`),
  ]).join("\n");
  return [
    `Booking request reference: ${data.requestReference}`,
    "",
    "Contact details:",
    `Name: ${data.contactName}`,
    `Email: ${data.contactEmail}`,
    `Phone: ${data.contactPhone}`,
    "",
    "Travelers:",
    passengers,
    "",
    "Selected flight:",
    `Route: ${data.route.originLabel || data.route.origin} (${data.route.origin}) to ${data.route.destinationLabel || data.route.destination} (${data.route.destination})`,
    `Trip: ${data.route.returnDate ? "Round trip" : "One way"}`,
    `Departure: ${data.route.departureDate}`,
    ...(data.route.returnDate ? [`Return: ${data.route.returnDate}`] : []),
    `Passengers: ${data.route.passengerCount}`,
    `Cabin: ${data.route.cabinClass.replaceAll("_", " ")}`,
    `Airline: ${data.selectedOffer.airlineName}`,
    `Fare: ${data.selectedOffer.totalCurrency} ${data.selectedOffer.totalAmount}`,
    itinerary,
    "",
    "Please confirm current fare and availability with the traveler.",
  ].join("\n");
}

export async function sendBookingRequestEmail(data: BookingRequestEmailData) {
  const text = bookingRequestText(data);
  const html = text.split("\n").map(line => line ? `<p>${escapeHtml(line)}</p>` : "<br>").join("");
  await createTransport().sendMail({
    from: EMAIL_FROM,
    to: BOOKING_REQUEST_RECIPIENT,
    replyTo: data.contactEmail,
    subject: `Bluebird booking request ${data.requestReference}: ${data.route.origin} to ${data.route.destination}`,
    text,
    html,
  });
}

export async function sendTicketConfirmationEmail(booking: {
  bookingReference: string;
  travelerName: string;
  travelerEmail: string;
  departureCity: string;
  arrivalCity: string;
  departureAt: Date;
  arrivalAt: Date;
  departureAirport: string | null;
  arrivalAirport: string | null;
  airlineName: string | null;
  flightNumber: string | null;
  seatNumber: string | null;
  eTicketNumber: string | null;
  paymentStatus: string;
  amountDue: string;
  amountPaid: string;
}, pdf: Buffer) {
  await createTransport().sendMail({
    from: EMAIL_FROM,
    to: booking.travelerEmail,
    subject: `Your Bluebird Airways ticket · ${booking.bookingReference}`,
    text: `Hello ${booking.travelerName},\n\nYour paid and confirmed Bluebird Airways booking ${booking.bookingReference} is attached as a PDF ticket.\n\nDeparture: ${booking.departureCity} · Arrival: ${booking.arrivalCity}\nKeep your booking reference nearby.`,
    html: `<p>Hello ${escapeHtml(booking.travelerName)},</p><p>Your paid and confirmed Bluebird Airways booking <strong>${escapeHtml(booking.bookingReference)}</strong> is attached as a PDF ticket.</p><p>Departure: ${escapeHtml(booking.departureCity)} · Arrival: ${escapeHtml(booking.arrivalCity)}</p><p>Keep your booking reference nearby.</p>`,
    attachments: [{ filename: `bluebird-${booking.bookingReference}.pdf`, content: pdf }],
  });
}
