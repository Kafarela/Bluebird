import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  Plane,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import type { RequestPassenger } from "@shared/bookingRequest";
import {
  readBookingDraft,
  clearBookingDraft,
  type BookingDraftPassenger,
} from "@/lib/bookingDraft";
import { trpc } from "@/lib/trpc";
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

export default function BookingRequestPage() {
  const draft = readBookingDraft();
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
  const [receipt, setReceipt] = useState("");
  const [emailHref, setEmailHref] = useState("");
  const [receiptFare, setReceiptFare] = useState<{
    totalAmount: string;
    totalCurrency: string;
    airlineName: string;
  } | null>(null);
  const [error, setError] = useState("");
  const submitRequest = trpc.bookingRequest.submit.useMutation();

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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!route || !offer) return;
    try {
      const completedPassengers = passengers.map(passenger => ({
        ...passenger,
        gender: passenger.gender as RequestPassenger["gender"],
      }));
      const result = await submitRequest.mutateAsync({
        contactName,
        contactEmail,
        contactPhone,
        passengers: completedPassengers,
        route,
        selectedOffer: offer,
      });
      const passengerLines = completedPassengers.map(
        (passenger, index) =>
          `Traveler ${index + 1}: ${passenger.fullName} | Gender: ${passenger.gender} | Type: ${passenger.type}`
      );
      const itineraryLines = offer.slices.flatMap((slice, sliceIndex) => [
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
        `Request reference: ${result.requestReference}`,
        "",
        "Contact details:",
        `Name: ${contactName.trim()}`,
        `Email: ${contactEmail.trim()}`,
        `Phone: ${contactPhone.trim()}`,
        "",
        "Travelers:",
        ...passengerLines,
        "",
        "Selected flight:",
        `Route: ${route.originLabel || route.origin} (${route.origin}) to ${route.destinationLabel || route.destination} (${route.destination})`,
        `Trip: ${route.returnDate ? "Round trip" : "One way"}`,
        `Departure: ${route.departureDate}`,
        ...(route.returnDate ? [`Return: ${route.returnDate}`] : []),
        `Passengers: ${route.passengerCount}`,
        `Cabin: ${route.cabinClass.replaceAll("_", " ")}`,
        `Airline: ${result.verifiedFare.airlineName}`,
        `Fare: ${money(result.verifiedFare.totalAmount, result.verifiedFare.totalCurrency)}`,
        ...itineraryLines,
        "",
        "Fare and availability must be reconfirmed. No seat is held, ticket issued, or payment taken.",
      ].join("\n");
      const emailSubject = `Bluebird booking request ${result.requestReference}`;
      setEmailHref(
        `mailto:love4rela@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
      );
      clearBookingDraft();
      setReceiptFare(result.verifiedFare);
      setReceipt(result.requestReference);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not save your request. Please try again."
      );
    }
  };

  return (
    <SiteShell>
      <section className="inner-hero">
        <div className="page-wrap">
          <div className="eyebrow light-eyebrow">
            <span className="eyebrow-line" /> FLIGHT REQUEST
          </div>
          <h1>
            {receipt
              ? "Your request is with us."
              : "Review the details before we take the next step."}
          </h1>
          <p>
            {receipt
              ? "Keep the reference below. Bluebird will recheck the live fare and availability before confirming any ticket."
              : "Choose a live offer, confirm your traveler details, and send a request for Bluebird to review."}
          </p>
        </div>
      </section>
      <main className="page-wrap section-block booking-request-page">
        {receipt ? (
          <section className="booking-request-receipt">
            <span className="request-receipt-icon">
              <CheckCircle2 size={24} />
            </span>
            <p className="card-kicker">REQUEST SAVED</p>
            <h2>{receipt}</h2>
            {receiptFare && (
              <p className="request-verified-fare">
                Duffel refreshed the selected offer when you submitted:{" "}
                {receiptFare.airlineName} ·{" "}
                {money(receiptFare.totalAmount, receiptFare.totalCurrency)}.
              </p>
            )}
            <p>
              We saved your request. Use the button below to open a prefilled
              email to love4rela@gmail.com, review it, and press Send in your
              email app. This is not a reservation or ticket: no seat is held,
              no ticket has been issued, and no payment was taken. Fare and
              availability must be reconfirmed by Bluebird.
            </p>
            <div className="request-receipt-actions">
              <a href={emailHref} className="primary-button">
                <Mail size={16} /> Send Booking Request to Bluebird
                <ArrowRight size={16} />
              </a>
              <Link href="/" className="secondary-button">
                Return home <ArrowRight size={16} />
              </Link>
              <Link href="/help" className="secondary-button">
                Visit Help Centre
              </Link>
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
              <div className="request-fare-note">
                <Clock3 size={16} />
                <span>
                  {offer.expiresAt
                    ? `Offer expiry shown by airline: ${formatMoment(offer.expiresAt)}.`
                    : "Airline availability and fare may change before confirmation."}{" "}
                  The offer is not held while your request is reviewed.
                </span>
              </div>
            </section>
            <form className="request-details-card" onSubmit={submit}>
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
              {error && <div className="error-banner">{error}</div>}
              <div className="request-submit-footer">
                <p>
                  <Mail size={15} />
                  <Phone size={15} /> Submitting sends a request only. No
                  payment, seat hold, or ticket issuance occurs.
                </p>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    submitRequest.isPending ||
                    passengers.length !== route.passengerCount
                  }
                >
                  {submitRequest.isPending
                    ? "Saving request…"
                    : "Save request and prepare email"}{" "}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </SiteShell>
  );
}
