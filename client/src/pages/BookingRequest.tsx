import { useState, type MouseEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  Plane,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import type {
  RequestOffer,
  RequestPassenger,
  RequestRoute,
} from "@shared/bookingRequest";
import {
  readBookingDraft,
  type BookingDraftPassenger,
} from "@/lib/bookingDraft";
import { SiteShell } from "@/components/SiteShell";

function formatMoment(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time to be reconfirmed"
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

function money(amount: string, currency: string) {
  const number = Number(amount);
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(
      number
    );
  } catch {
    return `${currency} ${number.toFixed(2)}`;
  }
}

const BOOKING_REQUEST_RECIPIENT = "booking.bluebirdairways@inbox.eu";

function buildBookingRequestEmailHref(data: {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  passengers: BookingDraftPassenger[];
  route: RequestRoute;
  offer: RequestOffer;
}) {
  const passengerLines = data.passengers.map((passenger, index) => {
    const type = passenger.type[0].toUpperCase() + passenger.type.slice(1);
    return `Traveler ${index + 1}: ${passenger.fullName} | Gender: ${passenger.gender || "Not selected"} | Type: ${type}`;
  });
  const itineraryLines = data.offer.slices.flatMap((slice, sliceIndex) => [
    `${sliceIndex === 0 ? "Outbound" : "Return"} itinerary${slice.duration ? ` (${slice.duration})` : ""}:`,
    ...slice.segments.map(
      segment =>
        `- ${segment.origin} to ${segment.destination} | ${segment.operatingCarrier} ${segment.flightNumber} | ${formatMoment(segment.departureAt)} to ${formatMoment(segment.arrivalAt)}`
    ),
  ]);
  const emailBody = [
    "Hello Bluebird,",
    "",
    "Please review my booking request.",
    "",
    "Contact details:",
    `Name: ${data.contactName.trim()}`,
    `Email: ${data.contactEmail.trim()}`,
    `Phone: ${data.contactPhone.trim()}`,
    "",
    "Travelers:",
    ...passengerLines,
    "",
    "Selected flight:",
    `Route: ${data.route.originLabel || data.route.origin} (${data.route.origin}) to ${data.route.destinationLabel || data.route.destination} (${data.route.destination})`,
    `Trip: ${data.route.returnDate ? "Round trip" : "One way"}`,
    `Departure: ${data.route.departureDate}`,
    ...(data.route.returnDate ? [`Return: ${data.route.returnDate}`] : []),
    `Passengers: ${data.route.passengerCount}`,
    `Cabin: ${data.route.cabinClass.replaceAll("_", " ")}`,
    `Airline: ${data.offer.airlineName}`,
    `Fare: ${money(data.offer.totalAmount, data.offer.totalCurrency)}`,
    ...itineraryLines,
    "",
    "Please confirm current fare and availability with Bluebird.",
  ].join("\n");
  const emailSubject = `Bluebird booking request: ${data.route.origin} to ${data.route.destination}`;
  return `mailto:${BOOKING_REQUEST_RECIPIENT}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
}

export default function BookingRequestPage() {
  const [draft] = useState(() => readBookingDraft());
  const route = draft?.route;
  const offer = draft?.selectedOffer;
  const initialPassengers = draft?.passengers || [];
  const [contactName, setContactName] = useState(
    draft?.contactName || initialPassengers[0]?.fullName || ""
  );
  const [contactEmail, setContactEmail] = useState(draft?.contactEmail || "");
  const [contactPhone, setContactPhone] = useState(draft?.contactPhone || "");
  const [passengers, setPassengers] =
    useState<BookingDraftPassenger[]>(initialPassengers);
  const [emailDraftOpened, setEmailDraftOpened] = useState(false);
  const emailHref =
    route && offer
      ? buildBookingRequestEmailHref({
          contactName,
          contactEmail,
          contactPhone,
          passengers,
          route,
          offer,
        })
      : "";

  const updatePassenger = (
    index: number,
    key: keyof RequestPassenger,
    value: string
  ) => {
    setPassengers(current =>
      current.map((passenger, passengerIndex) =>
        passengerIndex === index
          ? ({ ...passenger, [key]: value } as RequestPassenger)
          : passenger
      )
    );
  };

  const handleEmailClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const form = event.currentTarget.closest("form");
    if (form && !form.reportValidity()) {
      event.preventDefault();
      return;
    }
    setEmailDraftOpened(true);
  };

  return (
    <SiteShell>
      <section className="inner-hero">
        <div className="page-wrap">
          <div className="eyebrow light-eyebrow">
            <span className="eyebrow-line" /> FLIGHT REQUEST
          </div>
          <h1>
            {emailDraftOpened
              ? "Your email is ready."
              : "Review the details before we take the next step."}
          </h1>
          <p>
            {emailDraftOpened
              ? "Finish sending your request from your email app."
              : "Choose a live offer, confirm your traveler details, and send a request for Bluebird to review."}
          </p>
        </div>
      </section>
      <main className="page-wrap section-block booking-request-page">
        {emailDraftOpened ? (
          <section className="booking-request-receipt email-ready-state" role="status" aria-live="polite">
            <span className="request-receipt-icon">
              <CheckCircle2 size={24} />
            </span>
            <p className="card-kicker">BOOKING SUBMITTED</p>
            <h2>Your Request Has Been Submitted</h2>
            <p>
              Your booking request has been received, we’ll send your Booking reference to your email shortly. Thank you for trusting Bluebird!
            </p>
            <div className="request-receipt-actions">
              <a href={emailHref} className="primary-button">
                <Mail size={16} /> Open email again
                <ArrowRight size={16} />
              </a>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEmailDraftOpened(false)}
              >
                Back to review
              </button>
            </div>
          </section>
        ) : !route || !offer ? (
          <section className="empty-state">
            <h2>No flight selected yet.</h2>
            <p>
              Search current availability and choose an offer before sending a
              booking request.
            </p>
            <Link href="/flight-availability" className="primary-button">
              Search live flights <ArrowRight size={16} />
            </Link>
          </section>
        ) : (
          <>
            <div className="request-step-heading">
              <div>
                <p className="card-kicker">STEP 2 OF 2</p>
                <h2>Review your selected flight</h2>
              </div>
              <Link
                href={`/flight-availability?from=${encodeURIComponent(route.origin)}&to=${encodeURIComponent(route.destination)}&date=${encodeURIComponent(route.departureDate)}&returnDate=${encodeURIComponent(route.returnDate || "")}&travelers=${route.passengerCount}&class=${encodeURIComponent(route.cabinClass)}`}
                className="text-link navy-link"
              >
                <ArrowLeft size={15} /> Change flight
              </Link>
            </div>
            <section className="request-itinerary-card">
              <div className="request-itinerary-heading">
                <div>
                  <p className="card-kicker">{offer.airlineName}</p>
                  <h3>
                    {route.origin} <span>→</span> {route.destination}
                  </h3>
                </div>
                <strong>{money(offer.totalAmount, offer.totalCurrency)}</strong>
              </div>
              <div className="request-itinerary-meta">
                <span>
                  {route.departureDate}
                  {route.returnDate
                    ? ` · Return ${route.returnDate}`
                    : " · One way"}
                </span>
                <span>
                  {route.passengerCount} traveler
                  {route.passengerCount === 1 ? "" : "s"} ·{" "}
                  {route.cabinClass.replaceAll("_", " ")}
                </span>
              </div>
              {offer.slices.map((slice, sliceIndex) => (
                <div className="request-slice" key={sliceIndex}>
                  <p className="card-kicker">
                    {sliceIndex === 0 ? "OUTBOUND" : "RETURN"}
                    {slice.duration ? ` · ${slice.duration}` : ""}
                  </p>
                  {slice.segments.map((segment, segmentIndex) => (
                    <div
                      className="request-segment"
                      key={`${segment.flightNumber}-${segmentIndex}`}
                    >
                      <div>
                        <strong>
                          {segment.origin} <span>→</span> {segment.destination}
                        </strong>
                        <small>
                          {segment.operatingCarrier} · {segment.flightNumber}
                        </small>
                      </div>
                      <div className="request-segment-times">
                        <span>{formatMoment(segment.departureAt)}</span>
                        <Plane size={15} />
                        <span>{formatMoment(segment.arrivalAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </section>
            <form
              className="request-details-card"
              onSubmit={event => event.preventDefault()}
            >
              <div className="request-step-heading">
                <div>
                  <p className="card-kicker">TRAVELERS & CONTACT</p>
                  <h2>Who should Bluebird contact?</h2>
                </div>
              </div>
              <p className="request-private-note">
                <ShieldCheck size={16} /> Your contact and traveler details are
                sent securely to Bluebird.
              </p>
              <div className="booking-form-grid">
                <label className="field">
                  <span>Contact name</span>
                  <input
                    autoComplete="name"
                    value={contactName}
                    onChange={event => setContactName(event.target.value)}
                    minLength={2}
                    maxLength={180}
                    required
                  />
                </label>
                <label className="field">
                  <span>Email address</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={contactEmail}
                    onChange={event => setContactEmail(event.target.value)}
                    maxLength={320}
                    required
                  />
                </label>
                <label className="field">
                  <span>Phone number</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={contactPhone}
                    onChange={event => setContactPhone(event.target.value)}
                    minLength={5}
                    maxLength={60}
                    required
                  />
                </label>
              </div>
              <div className="request-passengers">
                <div className="passenger-details-heading">
                  <p className="card-kicker">PASSENGER DETAILS</p>
                  <span>
                    {passengers.length} traveler
                    {passengers.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="passenger-details-grid">
                  {passengers.map((passenger, index) => (
                    <div
                      className="passenger-detail-card request-passenger-card"
                      key={index}
                    >
                      <strong>Traveler {index + 1}</strong>
                      <label className="field">
                        <span>Full name</span>
                        <input
                          value={passenger.fullName}
                          onChange={event =>
                            updatePassenger(
                              index,
                              "fullName",
                              event.target.value
                            )
                          }
                          minLength={2}
                          maxLength={180}
                          required
                        />
                      </label>
                      <label className="field">
                        <span>Gender</span>
                        <select
                          value={passenger.gender}
                          onChange={event =>
                            updatePassenger(index, "gender", event.target.value)
                          }
                          required
                        >
                          <option value="">Select</option>
                          <option value="F">F</option>
                          <option value="M">M</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Traveler type</span>
                        <select
                          value={passenger.type}
                          onChange={event =>
                            updatePassenger(index, "type", event.target.value)
                          }
                        >
                          <option value="adult">Adult</option>
                          <option value="youth">Youth</option>
                          <option value="kid">Kid</option>
                          <option value="teenager">Teenager</option>
                        </select>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="request-submit-footer">
                <div className="request-submit-actions">
                  <a
                    href={emailHref}
                    className="primary-button"
                    onClick={handleEmailClick}
                  >
                    <Mail size={16} /> Send Booking Request to Bluebird
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </form>
          </>
        )}
      </main>
    </SiteShell>
  );
}
