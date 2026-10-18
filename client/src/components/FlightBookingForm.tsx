import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, LocateFixed, Search } from "lucide-react";
import { useLocation } from "wouter";
import type { RequestPassenger, RequestRoute } from "@shared/bookingRequest";
import {
  readBookingDraft,
  writeBookingDraft,
  type BookingDraftPassenger,
} from "@/lib/bookingDraft";
import { trpc } from "@/lib/trpc";
import { PlacePicker, type FlightPlace } from "@/components/PlacePicker";

type PassengerCategory = NonNullable<RequestRoute["passengerCategory"]>;
export type FlightSearchData = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  passengers: number;
  passengerTypes: RequestPassenger["type"][];
  passengerCategory: PassengerCategory;
  maxConnections: number;
};

const categories: { value: PassengerCategory; label: string }[] = [
  { value: "adult", label: "Adult" },
  { value: "youth", label: "Youth" },
  { value: "teenager", label: "Teenager" },
  { value: "adult_kids", label: "Adult&Kids" },
];

function localToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function newPassenger(
  type: RequestPassenger["type"] = "adult"
): BookingDraftPassenger {
  return { fullName: "", gender: "", type };
}

function typeFor(
  category: PassengerCategory,
  index: number
): RequestPassenger["type"] {
  if (category === "adult_kids") return index === 0 ? "adult" : "kid";
  return category;
}

function queryPlace(
  value: string | null,
  defaultValue: FlightPlace
): FlightPlace {
  const text = (value || "").trim();
  if (!text) return defaultValue;
  const code = /^[a-z]{3}$/i.test(text) ? text.toUpperCase() : "";
  return { label: code ? `${text.toUpperCase()}` : text, code };
}

function airportCode(place: FlightPlace) {
  const value = place.code || place.label.trim();
  return /^[A-Za-z]{3}$/.test(value) ? value.toUpperCase() : "";
}

export function FlightBookingForm({
  mode,
  onSearch,
  isSearching = false,
}: {
  mode: "home" | "page" | "availability";
  onSearch?: (data: FlightSearchData) => void;
  isSearching?: boolean;
}) {
  const [location, navigate] = useLocation();
  const params = useMemo(
    () => new URLSearchParams(location.split("?")[1] || ""),
    [location]
  );
  const savedDraft = useMemo(() => readBookingDraft(), []);
  const savedRoute = savedDraft?.route;
  const initialOrigin = savedRoute?.origin
    ? {
        label: savedRoute.originLabel || savedRoute.origin,
        code: savedRoute.origin,
      }
    : queryPlace(params.get("from"), { label: "", code: "" });
  const initialDestination = savedRoute?.destination
    ? {
        label: savedRoute.destinationLabel || savedRoute.destination,
        code: savedRoute.destination,
      }
    : queryPlace(params.get("to"), { label: "Los Angeles, CA", code: "LAX" });
  const requestedCount =
    savedRoute?.passengerCount || Number(params.get("travelers")) || 1;
  const requestedCategory = params.get("passengerCategory");
  const initialCategory =
    savedRoute?.passengerCategory ||
    (categories.some(option => option.value === requestedCategory)
      ? (requestedCategory as PassengerCategory)
      : "adult");
  const passengerCount = Number.isFinite(requestedCount)
    ? Math.max(1, Math.min(9, Math.floor(requestedCount)))
    : 1;
  const initialCount =
    initialCategory === "adult_kids"
      ? Math.max(2, passengerCount)
      : passengerCount;
  const requestedConnections =
    savedRoute?.maxConnections ?? Number(params.get("maxConnections") || 3);
  const initialConnections =
    requestedConnections === 0 ||
    requestedConnections === 1 ||
    requestedConnections === 3
      ? requestedConnections
      : 3;
  const [origin, setOrigin] = useState<FlightPlace>(initialOrigin);
  const [destination, setDestination] =
    useState<FlightPlace>(initialDestination);
  const [category, setCategory] = useState<PassengerCategory>(initialCategory);
  const [travelers, setTravelers] = useState<BookingDraftPassenger[]>(() => {
    const current = savedDraft?.passengers || [];
    return Array.from({ length: initialCount }, (_, index) => ({
      ...(current[index] || newPassenger(typeFor(initialCategory, index))),
      type: typeFor(initialCategory, index),
    }));
  });
  const [contactPhone, setContactPhone] = useState(
    savedDraft?.contactPhone || ""
  );
  const [departureDate, setDepartureDate] = useState(
    savedRoute?.departureDate || params.get("date") || ""
  );
  const [returnDate, setReturnDate] = useState(
    savedRoute ? savedRoute.returnDate || "" : params.get("returnDate") || ""
  );
  const [roundTrip, setRoundTrip] = useState(() => {
    if (savedRoute) return Boolean(savedRoute.returnDate);
    const flightType = params.get("flightType");
    if (flightType) return flightType === "Round Trip";
    if (params.has("returnDate")) return Boolean(params.get("returnDate"));
    if (params.has("trip")) return params.get("trip") === "roundtrip";
    return true;
  });
  const [maxConnections, setMaxConnections] =
    useState<number>(initialConnections);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  useEffect(() => {
    if (origin.code || origin.label || savedRoute?.origin) return;
    let cancelled = false;
    void fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(8000) })
      .then(response => {
        if (!response.ok) throw new Error("Could not detect the current city.");
        return response.json() as Promise<{
          city?: string;
          region?: string;
          latitude?: number;
          longitude?: number;
        }>;
      })
      .then(async result => {
        if (cancelled || !result.city) return;
        const choices =
          Number.isFinite(result.latitude) && Number.isFinite(result.longitude)
            ? await utils.duffel.placeSuggestions.fetch({
                lat: result.latitude,
                lng: result.longitude,
              })
            : await utils.duffel.placeSuggestions.fetch({
                query: [result.city, result.region].filter(Boolean).join(", "),
              });
        const nearest =
          choices.find(place => place.type === "airport") || choices[0];
        if (!cancelled && nearest) {
          const city = [result.city, result.region].filter(Boolean).join(", ");
          setOrigin({
            label: `${city} · ${nearest.iataCode}`,
            code: nearest.iataCode,
          });
        }
      })
      .catch(() => {
        // Keep the origin editable when IP geolocation is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [origin.code, origin.label, savedRoute?.origin, utils]);

  const resizeTravelers = (count: number) => {
    setTravelers(current =>
      Array.from({ length: count }, (_, index) => {
        const passenger =
          current[index] || newPassenger(typeFor(category, index));
        return { ...passenger, type: typeFor(category, index) };
      })
    );
  };

  const changeCategory = (next: PassengerCategory) => {
    setCategory(next);
    setTravelers(current =>
      current.map((passenger, index) => ({
        ...passenger,
        type: typeFor(next, index),
      }))
    );
  };

  const updateTraveler = (
    index: number,
    key: "fullName" | "gender",
    value: string
  ) => {
    setTravelers(current =>
      current.map((passenger, passengerIndex) =>
        passengerIndex === index
          ? ({ ...passenger, [key]: value } as BookingDraftPassenger)
          : passenger
      )
    );
  };

  const pickCurrentLocation = async (setter: (place: FlightPlace) => void) => {
    setError("");
    if (!navigator.geolocation) {
      setError(
        "Location is not available in this browser. Enter a city or airport instead."
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const choices = await utils.duffel.placeSuggestions.fetch({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          const nearest =
            choices.find(place => place.type === "airport") || choices[0];
          if (!nearest)
            throw new Error(
              "No nearby airport was found. Enter a city or airport instead."
            );
          setter({
            label: `${nearest.cityName || nearest.name} · ${nearest.iataCode}`,
            code: nearest.iataCode,
          });
        } catch {
          setError(
            "We could not find a nearby airport. Enter a city or airport instead."
          );
        }
      },
      () =>
        setError("Allow location access or enter a city or airport instead."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const originCode = airportCode(origin);
    const destinationCode = airportCode(destination);
    const missingPlaces = [
      ...(!originCode ? ["From"] : []),
      ...(!destinationCode ? ["To"] : []),
    ];
    if (missingPlaces.length) {
      setError(
        `The ${missingPlaces.join(" and ")} field${missingPlaces.length === 1 ? " needs" : " fields need"} an airport code. Choose a matching suggestion or enter its three-letter IATA code.`
      );
      return;
    }
    if (originCode === destinationCode) {
      setError("Choose a different destination from your origin.");
      return;
    }
    if (roundTrip && !returnDate) {
      setError("Choose a return date for a round trip.");
      return;
    }
    if (roundTrip && returnDate <= departureDate) {
      setError("The return date must be after the departure date.");
      return;
    }
    if (category === "adult_kids" && travelers.length < 2) {
      setError("Adult&Kids requires at least two passengers.");
      return;
    }
    if (
      travelers.some(
        passenger => passenger.fullName.trim().length < 2 || !passenger.gender
      )
    ) {
      setError("Enter the full name and gender for each passenger.");
      return;
    }
    const route: RequestRoute = {
      origin: originCode,
      originLabel: origin.label,
      destination: destinationCode,
      destinationLabel: destination.label,
      departureDate,
      returnDate: roundTrip ? returnDate : null,
      passengerCount: travelers.length,
      cabinClass: "economy",
      passengerCategory: category,
      maxConnections: maxConnections as 0 | 1 | 3,
    };
    const existing = readBookingDraft();
    const draftSaved = writeBookingDraft({
      ...existing,
      contactName: travelers[0]?.fullName.trim() || "",
      contactPhone: contactPhone.trim(),
      passengers: travelers.map(passenger => ({
        ...passenger,
        fullName: passenger.fullName.trim(),
      })),
      route,
      selectedOffer: null,
    });
    if (!draftSaved) {
      setError(
        "This browser is blocking temporary session storage. Allow it for this site before continuing."
      );
      return;
    }
    const search: FlightSearchData = {
      origin: route.origin,
      destination: route.destination,
      departureDate: route.departureDate,
      returnDate: route.returnDate || "",
      passengers: route.passengerCount,
      passengerTypes: travelers.map(passenger => passenger.type),
      passengerCategory: category,
      maxConnections,
    };
    if (mode === "availability") {
      onSearch?.(search);
      return;
    }
    const searchParams = new URLSearchParams({
      from: route.origin,
      to: route.destination,
      date: route.departureDate,
      travelers: String(route.passengerCount),
      returnDate: route.returnDate || "",
      maxConnections: String(maxConnections),
      passengerCategory: category,
      flightType: roundTrip ? "Round Trip" : "One Way",
    });
    navigate(`/flight-availability?${searchParams.toString()}`);
  };

  return (
    <form
      className={`flight-booking-form ${mode === "home" ? "flight-booking-form-home" : "planner-card booking-planner-card"}`}
      onSubmit={submit}
    >
      <div className="flight-trip-tabs" role="tablist" aria-label="Flight type">
        <button
          type="button"
          className={roundTrip ? "active" : ""}
          onClick={() => setRoundTrip(true)}
        >
          Round trip
        </button>
        <button
          type="button"
          className={!roundTrip ? "active" : ""}
          onClick={() => {
            setRoundTrip(false);
            setReturnDate("");
          }}
        >
          One Way
        </button>
      </div>
      {mode !== "home" && (
        <div className="planner-top">
          <div>
            <p className="card-kicker">
              {mode === "availability"
                ? "DUFFEL FLIGHTS API"
                : "FLIGHT PLANNER"}
            </p>
            <h2>
              {mode === "availability"
                ? "Check flight availability"
                : "Start your booking request"}
            </h2>
          </div>
          <span className="planner-badge">
            {mode === "availability" ? "Live offers" : "Live airline offers"}
          </span>
        </div>
      )}
      <div className="flight-form-grid">
        <div className="flight-place-block">
          <PlacePicker
            label="From"
            value={origin}
            onChange={place => {
              setOrigin(place);
              setError("");
            }}
            isInvalid={Boolean(error && !airportCode(origin))}
          />
          <button
            type="button"
            className="use-location-button"
            onClick={() => void pickCurrentLocation(setOrigin)}
          >
            <LocateFixed size={14} /> Use current location
          </button>
          <small className="location-disclosure">
            A third-party IP lookup suggests an approximate city/state. Device
            location requires browser permission.
          </small>
        </div>
        <div className="flight-place-block">
          <PlacePicker
            label="To"
            value={destination}
            onChange={place => {
              setDestination(place);
              setError("");
            }}
            isInvalid={Boolean(error && !airportCode(destination))}
          />
          <button
            type="button"
            className="use-location-button"
            onClick={() => void pickCurrentLocation(setDestination)}
          >
            <LocateFixed size={14} /> Use current location
          </button>
        </div>
        <label className="field">
          <span>Full Name</span>
          <input
            autoComplete="name"
            value={travelers[0]?.fullName || ""}
            onChange={event =>
              updateTraveler(0, "fullName", event.target.value)
            }
            placeholder="Passenger full name"
            maxLength={180}
            required
          />
        </label>
        <label className="field">
          <span>Gender</span>
          <select
            value={travelers[0]?.gender || ""}
            onChange={event => updateTraveler(0, "gender", event.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
        </label>
        <label className="field">
          <span>Phone number</span>
          <input
            type="tel"
            autoComplete="tel"
            value={contactPhone}
            onChange={event => setContactPhone(event.target.value)}
            placeholder="Phone number"
            minLength={5}
            maxLength={60}
            required
          />
        </label>
        <label className="field">
          <span>Passenger</span>
          <select
            value={category}
            onChange={event =>
              changeCategory(event.target.value as PassengerCategory)
            }
          >
            {categories.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Number of Passengers</span>
          <select
            value={String(travelers.length)}
            onChange={event => resizeTravelers(Number(event.target.value))}
          >
            {Array.from({ length: 9 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Layover Hub</span>
          <select
            value={String(maxConnections)}
            onChange={event => setMaxConnections(Number(event.target.value))}
          >
            <option value="0">Non-Stop</option>
            <option value="1">Single Layover</option>
            <option value="3">Multi-stop</option>
          </select>
        </label>
        <label className="field">
          <span>Depart (MM/DD/YYYY)</span>
          <input
            type="date"
            lang="en-US"
            value={departureDate}
            onChange={event => setDepartureDate(event.target.value)}
            min={localToday()}
            required
          />
        </label>
        {roundTrip && (
          <label className="field">
            <span>Return (MM/DD/YYYY)</span>
            <input
              type="date"
              lang="en-US"
              value={returnDate}
              onChange={event => setReturnDate(event.target.value)}
              min={departureDate || localToday()}
              required
            />
          </label>
        )}
      </div>
      {travelers.length > 1 && (
        <section className="flight-extra-passengers">
          <p className="card-kicker">ADDITIONAL PASSENGERS</p>
          <div className="passenger-details-grid">
            {travelers.slice(1).map((passenger, offset) => {
              const index = offset + 1;
              return (
                <div className="passenger-detail-card" key={index}>
                  <strong>Passenger {index + 1}</strong>
                  <label className="field">
                    <span>Full Name</span>
                    <input
                      value={passenger.fullName}
                      onChange={event =>
                        updateTraveler(index, "fullName", event.target.value)
                      }
                      maxLength={180}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Gender</span>
                    <select
                      value={passenger.gender}
                      onChange={event =>
                        updateTraveler(index, "gender", event.target.value)
                      }
                      required
                    >
                      <option value="">Select</option>
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {category !== "adult" && (
        <p className="flight-fare-note">
          Duffel availability may show adult-based fares for Youth or Teenager
          categories. Bluebird will confirm the airline fare for each passenger
          before any ticket is issued.
        </p>
      )}
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <div className="flight-form-footer">
        <p>
          Traveler details stay in this browser session. A search or request
          does not reserve a seat or take payment.
        </p>
        <button
          className="primary-button"
          type="submit"
          disabled={isSearching}
          aria-busy={isSearching}
        >
          {isSearching ? (
            <span className="bluebird-spinner" aria-hidden="true" />
          ) : (
            <Search size={17} />
          )}{" "}
          {isSearching
            ? "Searching flights…"
            : mode === "availability"
              ? "Check availability"
              : "Check flight availability"}{" "}
          {!isSearching && <ArrowRight size={16} />}
        </button>
      </div>
    </form>
  );
}
