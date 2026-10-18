import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Globe2, Plane, Search } from "lucide-react";
import { useLocation } from "wouter";
import type { RequestOffer } from "@shared/bookingRequest";
import {
  readBookingDraft,
  writeBookingDraft,
  type BookingDraftPassenger,
} from "@/lib/bookingDraft";
import { trpc } from "@/lib/trpc";
import { SiteShell } from "@/components/SiteShell";

type CabinClass = "economy" | "premium_economy" | "business" | "first";
type FlightSegment = {
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  operatingCarrier: string;
  flightNumber: string;
};
type FlightSlice = { duration: string | null; segments: FlightSegment[] };
type DuffelOffer = {
  id: string;
  totalAmount: string;
  totalCurrency: string;
  expiresAt: string | null;
  ownerName: string;
  slices: FlightSlice[];
};

function initialCabin(value: string | null): CabinClass {
  if (value === "premium_economy" || value === "premium economy")
    return "premium_economy";
  if (value === "business" || value === "Business Class") return "business";
  if (value === "first" || value === "First Class") return "first";
  return "economy";
}

function shortTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

function fullDate(value: string | null | undefined) {
  if (!value) return "Time pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time pending"
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

function priceLabel(amount: string, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(
      Number(amount)
    );
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

export default function FlightAvailabilityPage() {
  const [location, navigate] = useLocation();
  const params = useMemo(
    () => new URLSearchParams(location.split("?")[1] || ""),
    [location]
  );
  const [origin, setOrigin] = useState(
    (params.get("from") || "").toUpperCase()
  );
  const [destination, setDestination] = useState(
    (params.get("to") || "LAX").toUpperCase()
  );
  const [departureDate, setDepartureDate] = useState(params.get("date") || "");
  const [returnDate, setReturnDate] = useState(params.get("returnDate") || "");
  const [passengers, setPassengers] = useState(params.get("travelers") || "1");
  const [cabinClass, setCabinClass] = useState<CabinClass>(
    initialCabin(params.get("class"))
  );
  const [maxConnections, setMaxConnections] = useState(
    params.get("maxConnections") ||
      (params.get("layoverHub") === "Non-Stop"
        ? "0"
        : params.get("layoverHub") === "Single Layover"
          ? "1"
          : "3")
  );
  const [submitted, setSubmitted] = useState(
    Boolean(params.get("from") && params.get("date"))
  );
  const [selectionError, setSelectionError] = useState("");
  const query = trpc.duffel.search.useQuery(
    {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers: Number(passengers),
      cabinClass,
      maxConnections: Number(maxConnections),
    },
    {
      enabled:
        submitted &&
        /^[A-Za-z]{3}$/.test(origin) &&
        /^[A-Za-z]{3}$/.test(destination) &&
        Boolean(departureDate),
      retry: false,
    }
  );
  const offers = (query.data?.offers || []) as DuffelOffer[];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
  };

  const selectOffer = (offer: DuffelOffer) => {
    const existing = readBookingDraft();
    const count = Number(passengers);
    const travelerList: BookingDraftPassenger[] =
      existing?.passengers?.length === count
        ? existing.passengers
        : Array.from({ length: count }, () => ({
            fullName: "",
            gender: "" as const,
            type: "adult" as const,
          }));
    const outboundSegments = offer.slices[0]?.segments || [];
    const selectedOrigin =
      outboundSegments[0]?.origin.toUpperCase() || origin.toUpperCase();
    const selectedDestination =
      outboundSegments[
        outboundSegments.length - 1
      ]?.destination.toUpperCase() || destination.toUpperCase();
    const selectedOffer: RequestOffer = {
      id: offer.id,
      offerRequestId: query.data?.offerRequestId || null,
      airlineName: offer.ownerName,
      totalAmount: String(offer.totalAmount),
      totalCurrency: offer.totalCurrency,
      expiresAt: offer.expiresAt || null,
      slices: offer.slices.map(slice => ({
        duration: slice.duration || null,
        segments: slice.segments.map(segment => ({
          origin: segment.origin,
          destination: segment.destination,
          departureAt: segment.departureAt,
          arrivalAt: segment.arrivalAt,
          operatingCarrier: segment.operatingCarrier,
          flightNumber: segment.flightNumber,
        })),
      })),
    };
    const saved = writeBookingDraft({
      contactName: existing?.contactName || travelerList[0]?.fullName || "",
      contactEmail: existing?.contactEmail || "",
      contactPhone: existing?.contactPhone || "",
      passengers: travelerList,
      route: {
        origin: selectedOrigin,
        destination: selectedDestination,
        departureDate,
        returnDate: returnDate || null,
        passengerCount: count,
        cabinClass,
      },
      selectedOffer,
    });
    if (!saved) {
      setSelectionError(
        "This browser is blocking temporary session storage. Allow it for this site or use another browser before continuing."
      );
      return;
    }
    setSelectionError("");
    navigate("/booking-request");
  };

  return (
    <SiteShell>
      <section className="inner-hero">
        <div className="page-wrap">
          <div className="eyebrow light-eyebrow">
            <span className="eyebrow-line" /> LIVE FLIGHT AVAILABILITY
          </div>
          <h1>See what is available right now.</h1>
          <p>
            Search current airline offers by airport code, then choose a flight
            to review before sending a request.
          </p>
        </div>
      </section>
      <main className="page-wrap section-block availability-page">
        <form
          className="planner-card availability-search-card"
          onSubmit={submit}
        >
          <div className="planner-top">
            <div>
              <p className="card-kicker">DUFFEL FLIGHTS API</p>
              <h2>Find available flights</h2>
            </div>
            <span className="planner-badge">
              <Globe2 size={15} /> Live offers
            </span>
          </div>
          <div className="booking-form-grid">
            <label className="field">
              <span>From (IATA code)</span>
              <input
                value={origin}
                onChange={event => setOrigin(event.target.value.toUpperCase())}
                placeholder="JFK"
                minLength={3}
                maxLength={3}
                pattern="[A-Za-z]{3}"
                title="Enter a three-letter IATA airport code."
                required
              />
              <small>
                Use a 3-letter airport code such as JFK, LAX, or LHR.
              </small>
            </label>
            <label className="field">
              <span>To (IATA code)</span>
              <input
                value={destination}
                onChange={event =>
                  setDestination(event.target.value.toUpperCase())
                }
                placeholder="LAX"
                minLength={3}
                maxLength={3}
                pattern="[A-Za-z]{3}"
                title="Enter a three-letter IATA airport code."
                required
              />
            </label>
            <label className="field">
              <span>Departure</span>
              <input
                type="date"
                value={departureDate}
                onChange={event => setDepartureDate(event.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>
            <label className="field">
              <span>Return (optional)</span>
              <input
                type="date"
                value={returnDate}
                onChange={event => setReturnDate(event.target.value)}
                min={departureDate || new Date().toISOString().slice(0, 10)}
              />
            </label>
            <label className="field">
              <span>Passengers</span>
              <select
                value={passengers}
                onChange={event => setPassengers(event.target.value)}
              >
                {Array.from({ length: 9 }, (_, index) => (
                  <option key={index + 1} value={String(index + 1)}>
                    {index + 1} traveler{index ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Cabin</span>
              <select
                value={cabinClass}
                onChange={event =>
                  setCabinClass(event.target.value as CabinClass)
                }
              >
                <option value="economy">Economy</option>
                <option value="premium_economy">Premium economy</option>
                <option value="business">Business class</option>
                <option value="first">First class</option>
              </select>
            </label>
            <label className="field">
              <span>Stops</span>
              <select
                value={maxConnections}
                onChange={event => setMaxConnections(event.target.value)}
              >
                <option value="0">Non-stop</option>
                <option value="1">Up to 1 connection</option>
                <option value="3">Up to 3 connections</option>
              </select>
            </label>
          </div>
          <div className="booking-form-footer">
            <p>
              Search uses adult fares; contact Bluebird for child or infant
              pricing. A request does not hold a seat.
            </p>
            <button type="submit" className="primary-button">
              <Search size={17} /> Check availability
            </button>
          </div>
        </form>
        {selectionError && (
          <div className="error-banner" role="alert">
            {selectionError}
          </div>
        )}
        <section className="availability-results" aria-live="polite">
          {!submitted ? (
            <div className="empty-state">
              <h3>Ready when you are.</h3>
              <p>
                Enter your route and dates above to search live airline offers.
              </p>
            </div>
          ) : query.isLoading ? (
            <div className="empty-state">
              <h3>Searching live airline offers…</h3>
              <p>Duffel is checking the selected route and passenger count.</p>
            </div>
          ) : query.isError ? (
            <div className="empty-state">
              <h3>We could not complete that search.</h3>
              <p>{query.error.message}</p>
              <p>
                Use IATA codes only and make sure the departure date is valid
                for booking.
              </p>
            </div>
          ) : (
            <>
              <div className="results-heading">
                <div>
                  <p className="card-kicker">DUFFEL LIVE RESULTS</p>
                  <h2>
                    {offers.length} offer{offers.length === 1 ? "" : "s"} found
                  </h2>
                </div>
                <span>
                  {origin} → {destination}
                </span>
              </div>
              {offers.length ? (
                <div className="availability-offer-list">
                  {offers.map(offer => (
                    <article className="availability-offer" key={offer.id}>
                      <div className="availability-offer-heading">
                        <div>
                          <p className="card-kicker">OPERATING CARRIER</p>
                          <h3>{offer.ownerName}</h3>
                        </div>
                        <strong>
                          {priceLabel(
                            String(offer.totalAmount),
                            offer.totalCurrency
                          )}
                        </strong>
                      </div>
                      {offer.slices.map((slice, sliceIndex) => (
                        <div
                          className="availability-slice"
                          key={`${offer.id}-${sliceIndex}`}
                        >
                          <span className="slice-label">
                            {sliceIndex === 0 ? "OUTBOUND" : "RETURN"}
                            {slice.duration ? ` · ${slice.duration}` : ""}
                          </span>
                          {slice.segments.map((segment, segmentIndex) => (
                            <div
                              className="availability-segment"
                              key={`${offer.id}-${sliceIndex}-${segmentIndex}`}
                            >
                              <div>
                                <strong>
                                  {shortTime(segment.departureAt)}
                                </strong>
                                <span>{segment.origin}</span>
                              </div>
                              <Plane size={16} />
                              <div>
                                <strong>{shortTime(segment.arrivalAt)}</strong>
                                <span>{segment.destination}</span>
                              </div>
                              <div className="segment-carrier">
                                <strong>{segment.operatingCarrier}</strong>
                                <span>{segment.flightNumber}</span>
                              </div>
                              <small className="segment-date">
                                {fullDate(segment.departureAt)}
                              </small>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div className="availability-offer-footer">
                        <span>
                          {offer.expiresAt
                            ? `Offer expires ${fullDate(offer.expiresAt)}`
                            : "Airline will reconfirm fare and availability"}
                        </span>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => selectOffer(offer)}
                        >
                          Continue with this flight <ArrowRight size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No live offers returned.</h3>
                  <p>Try a nearby airport or another travel date.</p>
                </div>
              )}
              <p className="results-note">
                Live availability is supplied by Duffel. Choosing an offer only
                starts a request for owner review; it does not reserve
                inventory, issue a ticket, or collect payment.
              </p>
            </>
          )}
        </section>
      </main>
    </SiteShell>
  );
}
