import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Globe2, Search } from "lucide-react";
import { useLocation } from "wouter";
import type { RequestPassenger } from "@shared/bookingRequest";
import { writeBookingDraft } from "@/lib/bookingDraft";
import { SiteShell } from "@/components/SiteShell";

type PassengerDraft = Omit<RequestPassenger, "gender"> & {
  gender: "" | "M" | "F";
};
type CabinClass = "economy" | "premium_economy" | "business" | "first";

function initialCabin(value: string | null): CabinClass {
  if (value === "premium_economy" || value === "premium economy")
    return "premium_economy";
  if (value === "business" || value === "Business Class") return "business";
  if (value === "first" || value === "First Class") return "first";
  return "economy";
}

export default function BookPage() {
  const [location, navigate] = useLocation();
  const params = useMemo(
    () => new URLSearchParams(location.split("?")[1] || ""),
    [location]
  );
  const [travelers, setTravelers] = useState<PassengerDraft[]>([
    { fullName: "", gender: "", type: "adult" },
  ]);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [origin, setOrigin] = useState(
    (params.get("from") || "").toUpperCase()
  );
  const [destination, setDestination] = useState(
    (params.get("to") || "").toUpperCase()
  );
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [roundTrip, setRoundTrip] = useState(
    params.get("flightType") === "Round Trip"
  );
  const [cabinClass, setCabinClass] = useState<CabinClass>(
    initialCabin(params.get("class"))
  );
  const [maxConnections, setMaxConnections] = useState(
    params.get("maxConnections") || "3"
  );
  const [storageError, setStorageError] = useState("");

  const updatePassengerCount = (value: string) => {
    const count = Number(value);
    setTravelers(current =>
      Array.from(
        { length: count },
        (_, index) =>
          current[index] || { fullName: "", gender: "", type: "adult" }
      )
    );
  };

  const updatePassenger = (
    index: number,
    key: keyof PassengerDraft,
    value: string
  ) => {
    setTravelers(current =>
      current.map((traveler, travelerIndex) =>
        travelerIndex === index
          ? ({ ...traveler, [key]: value } as PassengerDraft)
          : traveler
      )
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalizedOrigin = origin.trim().toUpperCase();
    const normalizedDestination = destination.trim().toUpperCase();
    const route = {
      origin: normalizedOrigin,
      destination: normalizedDestination,
      departureDate,
      returnDate: roundTrip ? returnDate : null,
      passengerCount: travelers.length,
      cabinClass,
    };
    const saved = writeBookingDraft({
      contactName: travelers[0]?.fullName.trim() || "",
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      passengers: travelers.map(traveler => ({
        ...traveler,
        fullName: traveler.fullName.trim(),
      })),
      route,
      selectedOffer: null,
    });
    if (!saved) {
      setStorageError(
        "This browser is blocking temporary session storage. Allow it for this site or use another browser before continuing."
      );
      return;
    }
    setStorageError("");
    const searchParams = new URLSearchParams({
      from: route.origin,
      to: route.destination,
      date: route.departureDate,
      travelers: String(route.passengerCount),
      class: route.cabinClass,
      maxConnections,
      returnDate: route.returnDate || "",
    });
    navigate(`/flight-availability?${searchParams.toString()}`);
  };

  return (
    <SiteShell>
      <section className="inner-hero">
        <div className="page-wrap">
          <div className="eyebrow light-eyebrow">
            <span className="eyebrow-line" /> BOOK A FLIGHT
          </div>
          <h1>Plan the route. We’ll keep the details clear.</h1>
          <p>
            Add your contact and traveler details, choose your route and dates,
            then review live airline availability.
          </p>
        </div>
      </section>
      <main className="page-wrap section-block book-page-content">
        <form className="planner-card booking-planner-card" onSubmit={submit}>
          <div className="planner-top">
            <div>
              <p className="card-kicker">FLIGHT PLANNER</p>
              <h2>Start your booking request</h2>
            </div>
            <span className="planner-badge">
              <Globe2 size={15} /> Live airline offers
            </span>
          </div>
          <div className="booking-form-grid">
            <label className="field">
              <span>Contact email</span>
              <input
                type="email"
                autoComplete="email"
                value={contactEmail}
                onChange={event => setContactEmail(event.target.value)}
                placeholder="you@example.com"
                maxLength={320}
                required
              />
            </label>
            <label className="field">
              <span>Contact phone</span>
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
              <span>Number of travelers</span>
              <select
                value={String(travelers.length)}
                onChange={event => updatePassengerCount(event.target.value)}
              >
                {Array.from({ length: 9 }, (_, index) => (
                  <option key={index + 1} value={String(index + 1)}>
                    {index + 1} traveler{index ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <section className="request-passengers">
            <div className="passenger-details-heading">
              <p className="card-kicker">PASSENGER DETAILS</p>
              <span>
                Enter each traveler as it appears on their travel document.
              </span>
            </div>
            <div className="passenger-details-grid">
              {travelers.map((traveler, index) => (
                <div
                  className="passenger-detail-card request-passenger-card"
                  key={index}
                >
                  <strong>Traveler {index + 1}</strong>
                  <label className="field">
                    <span>Full name</span>
                    <input
                      autoComplete={index === 0 ? "name" : "off"}
                      value={traveler.fullName}
                      onChange={event =>
                        updatePassenger(index, "fullName", event.target.value)
                      }
                      placeholder="Full name"
                      minLength={2}
                      maxLength={180}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Gender</span>
                    <select
                      value={traveler.gender}
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
                      value={traveler.type}
                      onChange={event =>
                        updatePassenger(index, "type", event.target.value)
                      }
                    >
                      <option value="adult">Adult</option>
                      <option value="kid">Kid</option>
                      <option value="teenager">Teenager</option>
                    </select>
                  </label>
                </div>
              ))}
            </div>
          </section>
          <div className="booking-form-grid route-details-grid">
            <label className="field">
              <span>From (3-letter airport code)</span>
              <input
                value={origin}
                onChange={event => setOrigin(event.target.value.toUpperCase())}
                placeholder="JFK"
                minLength={3}
                maxLength={3}
                pattern="[A-Za-z]{3}"
                title="Enter a three-letter IATA airport code, such as JFK."
                autoCapitalize="characters"
                required
              />
              <small>Use an IATA code such as JFK, LAX, or LHR.</small>
            </label>
            <label className="field">
              <span>To (3-letter airport code)</span>
              <input
                value={destination}
                onChange={event =>
                  setDestination(event.target.value.toUpperCase())
                }
                placeholder="LAX"
                minLength={3}
                maxLength={3}
                pattern="[A-Za-z]{3}"
                title="Enter a three-letter IATA airport code, such as LAX."
                autoCapitalize="characters"
                required
              />
            </label>
            <label className="field">
              <span>Trip type</span>
              <select
                value={roundTrip ? "round_trip" : "one_way"}
                onChange={event =>
                  setRoundTrip(event.target.value === "round_trip")
                }
              >
                <option value="one_way">One way</option>
                <option value="round_trip">Round trip</option>
              </select>
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
            {roundTrip && (
              <label className="field">
                <span>Return</span>
                <input
                  type="date"
                  value={returnDate}
                  onChange={event => setReturnDate(event.target.value)}
                  min={departureDate || new Date().toISOString().slice(0, 10)}
                  required
                />
              </label>
            )}
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
          {storageError && (
            <div className="error-banner" role="alert">
              {storageError}
            </div>
          )}
          <div className="booking-form-footer">
            <p>
              Traveler details stay in this browser session until you send a
              request. Live search uses adult fares; ask Bluebird to reconfirm
              pricing for children or infants. No payment is taken and no ticket
              is issued in this flow.
            </p>
            <button type="submit" className="primary-button">
              <Search size={17} /> Check flight availability{" "}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </main>
    </SiteShell>
  );
}
