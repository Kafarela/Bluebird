import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  Plane,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import type { RequestPassenger } from "@shared/bookingRequest";
import {
  readBookingDraft,
  type BookingDraftPassenger,
} from "@/lib/bookingDraft";
import { SiteShell } from "@/components/SiteShell";
import { trpc } from "@/lib/trpc";

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
  const [requestReference, setRequestReference] = useState("");
  const sendBookingRequest = trpc.bookingRequest.submit.useMutation({
    onSuccess: result => {
      setRequestReference(result.requestReference);
      setEmailDraftOpened(true);
    },
  });

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!route || !offer || sendBookingRequest.isPending) return;
    sendBookingRequest.mutate({
      contactName,
      contactEmail,
      contactPhone,
      passengers: passengers.map(passenger => ({
        ...passenger,
        gender: passenger.gender as "M" | "F",
      })),
      route,
      selectedOffer: offer,
    });
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
            <p className="card-kicker">EMAIL DRAFT READY</p>
            <h2>Your request email is ready</h2>
            <p>
              Your booking request was sent securely to Bluebird. Keep this
              reference for your records: <strong>{requestReference}</strong>.
            </p>
            <div className="request-receipt-actions">
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
              onSubmit={handleSubmit}
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
                  <button className="primary-button" type="submit" disabled={sendBookingRequest.isPending}>
                    <Mail size={16} /> {sendBookingRequest.isPending ? "Sending request…" : "Send Booking Request to Bluebird"}
                    <ArrowRight size={16} />
                  </button>
                </div>
                {sendBookingRequest.error && <p className="error-banner">{sendBookingRequest.error.message}</p>}
              </div>
            </form>
          </>
        )}
      </main>
    </SiteShell>
  );
}
