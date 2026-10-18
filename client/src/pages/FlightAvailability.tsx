import { useMemo, useState } from "react";
import { ArrowRight, Plane } from "lucide-react";
import { useLocation } from "wouter";
import type { RequestOffer } from "@shared/bookingRequest";
import { readBookingDraft, writeBookingDraft } from "@/lib/bookingDraft";
import { trpc } from "@/lib/trpc";
import { SiteShell } from "@/components/SiteShell";
import {
  FlightBookingForm,
  type FlightSearchData,
} from "@/components/FlightBookingForm";

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

function initialSearch(): FlightSearchData {
  const params = new URLSearchParams(window.location.search);
  const draft = readBookingDraft();
  const route = draft?.route;
  const categoryValues = ["adult", "youth", "teenager", "adult_kids"] as const;
  const requestedCategory =
    route?.passengerCategory || params.get("passengerCategory");
  const category = categoryValues.includes(
    requestedCategory as (typeof categoryValues)[number]
  )
    ? (requestedCategory as FlightSearchData["passengerCategory"])
    : "adult";
  const requestedCount =
    route?.passengerCount || Number(params.get("travelers")) || 1;
  const boundedCount = Number.isFinite(requestedCount)
    ? Math.max(1, Math.min(9, Math.floor(requestedCount)))
    : 1;
  const count =
    category === "adult_kids" ? Math.max(2, boundedCount) : boundedCount;
  const requestedConnections =
    route?.maxConnections ?? Number(params.get("maxConnections") || 3);
  const maxConnections =
    requestedConnections === 0 ||
    requestedConnections === 1 ||
    requestedConnections === 3
      ? requestedConnections
      : 3;
  const passengerCategory = category;
  const passengerTypes = Array.from({ length: count }, (_, index) =>
    passengerCategory === "adult_kids"
      ? index === 0
        ? ("adult" as const)
        : ("kid" as const)
      : passengerCategory
  );
  return {
    origin: route?.origin || params.get("from")?.toUpperCase() || "",
    destination: route?.destination || params.get("to")?.toUpperCase() || "LAX",
    departureDate: route?.departureDate || params.get("date") || "",
    returnDate: route ? route.returnDate || "" : params.get("returnDate") || "",
    passengers: count,
    passengerTypes,
    passengerCategory,
    maxConnections,
  };
}

export default function FlightAvailabilityPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState<FlightSearchData>(initialSearch);
  const [submitted, setSubmitted] = useState(() =>
    Boolean(initialSearch().origin && initialSearch().departureDate)
  );
  const [selectionError, setSelectionError] = useState("");
  const query = trpc.duffel.search.useQuery(
    {
      origin: search.origin,
      destination: search.destination,
      departureDate: search.departureDate,
      returnDate: search.returnDate,
      passengers: search.passengers,
      passengerTypes: search.passengerTypes,
      cabinClass: "economy",
      maxConnections: search.maxConnections,
    },
    {
      enabled:
        submitted &&
        /^[A-Za-z]{3}$/.test(search.origin) &&
        /^[A-Za-z]{3}$/.test(search.destination) &&
        Boolean(search.departureDate),
      retry: false,
    }
  );
  const offers = (query.data?.offers || []) as DuffelOffer[];

  const submitSearch = (data: FlightSearchData) => {
    setSelectionError("");
    setSearch(data);
    setSubmitted(true);
  };

  const selectOffer = (offer: DuffelOffer) => {
    const existing = readBookingDraft();
    const count = search.passengers;
    const travelerList = Array.from({ length: count }, (_, index) => {
      const type =
        search.passengerCategory === "adult_kids"
          ? index === 0
            ? ("adult" as const)
            : ("kid" as const)
          : search.passengerCategory;
      const traveler = existing?.passengers?.[index] || {
        fullName: "",
        gender: "" as const,
        type,
      };
      return { ...traveler, type };
    });
    const outboundSegments = offer.slices[0]?.segments || [];
    const selectedOrigin =
      outboundSegments[0]?.origin.toUpperCase() || search.origin.toUpperCase();
    const selectedDestination =
      outboundSegments[
        outboundSegments.length - 1
      ]?.destination.toUpperCase() || search.destination.toUpperCase();
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
      ...existing,
      contactName: existing?.contactName || travelerList[0]?.fullName || "",
      passengers: travelerList,
      route: {
        origin: selectedOrigin,
        originLabel: existing?.route?.originLabel || selectedOrigin,
        destination: selectedDestination,
        destinationLabel:
          existing?.route?.destinationLabel || selectedDestination,
        departureDate: search.departureDate,
        returnDate: search.returnDate || null,
        passengerCount: count,
        cabinClass: "economy",
        passengerCategory: search.passengerCategory,
        maxConnections: search.maxConnections as 0 | 1 | 3,
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
            Use the same traveler, route, date, and layover details to check
            live airline offers.
          </p>
        </div>
      </section>
      <main className="page-wrap section-block availability-page">
        <FlightBookingForm
          mode="availability"
          onSearch={submitSearch}
          isSearching={query.isFetching}
        />
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
                Choose a city or airport and enter your trip details above to
                search live offers.
              </p>
            </div>
          ) : query.isFetching ? (
            <div className="empty-state search-status" role="status">
              <span className="bluebird-spinner" aria-hidden="true" />
              <h3>Searching live airline offers…</h3>
              <p>
                Duffel is checking your selected route, passenger category, and
                dates.
              </p>
            </div>
          ) : query.isError ? (
            <div className="empty-state api-error-state" role="alert">
              <h3>We could not complete that search.</h3>
              <p>
                {query.error.message ||
                  "The live flight search is temporarily unavailable."}
              </p>
              <p>
                Check the selected city or airport codes and dates. If live
                search is not configured, Bluebird must add its Duffel API key
                before offers can load.
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                Try flight search again
              </button>
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
                  {search.origin} → {search.destination}
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
