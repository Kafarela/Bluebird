import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, Download, Globe2, LockKeyhole, Mail, MapPin, Plane, Search, ShieldCheck, Ticket, UserRound } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { SiteShell } from "@/components/SiteShell";

const americanCountries = [
  "Antigua and Barbuda", "Argentina", "Bahamas", "Barbados", "Belize", "Bolivia", "Brazil", "Canada", "Chile", "Colombia", "Costa Rica", "Cuba", "Dominica", "Dominican Republic", "Ecuador", "El Salvador", "Grenada", "Guatemala", "Guyana", "Haiti", "Honduras", "Jamaica", "Mexico", "Nicaragua", "Panama", "Paraguay", "Peru", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Suriname", "Trinidad and Tobago", "United States", "Uruguay", "Venezuela",
];

const regionGroups = [
  { label: "North America & the Caribbean", countries: ["Canada", "United States", "Mexico", "Guatemala", "Belize", "El Salvador", "Honduras", "Nicaragua", "Costa Rica", "Panama", "Cuba", "Jamaica", "Haiti", "Dominican Republic", "Bahamas", "Barbados", "Trinidad and Tobago", "Antigua and Barbuda", "Dominica", "Grenada", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines"] },
  { label: "South America", countries: ["Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Guyana", "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela"] },
  { label: "Atlantic & Europe", countries: ["United Kingdom"] },
];

function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="inner-hero"><div className="page-wrap"><div className="eyebrow light-eyebrow"><span className="eyebrow-line" /> {eyebrow}</div><h1>{title}</h1><p>{copy}</p></div></section>;
}

function formatDateTime(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const signup = trpc.auth.signup.useMutation();
  const login = trpc.auth.login.useMutation();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      if (isSignup) await signup.mutateAsync({ name, email, password });
      else await login.mutateAsync({ email, password });
      const redirect = new URLSearchParams(window.location.search).get("redirect");
      navigate(redirect?.startsWith("/") ? redirect : "/");
      window.location.reload();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to complete authentication.");
    }
  };
  const submitting = signup.isPending || login.isPending;
  return <SiteShell><PageIntro eyebrow={isSignup ? "MAKE IT YOURS" : "WELCOME BACK"} title={isSignup ? "Start your Bluebird journey." : "Your journey, one sign-in away."} copy={isSignup ? "Create your traveler account and keep your booking details close." : "Sign in with your Bluebird email and password to review your itinerary or manage owner tickets."} /><main className="page-wrap section-block narrow-section"><div className="auth-card"><div className="auth-card-icon"><UserRound size={24} /></div><p className="card-kicker">{isAuthenticated ? "YOU ARE SIGNED IN" : isSignup ? "TRAVELER SIGN UP" : "TRAVELER LOGIN"}</p>{isAuthenticated ? <><h2>Welcome, {user?.name || "traveler"}.</h2><p>Your Bluebird session is ready. You can now review booking details with your reference.</p><div className="action-row"><Link href="/bookings" className="primary-button">View my bookings <ArrowRight size={16} /></Link><button className="secondary-button" onClick={() => void logout()}>Log out</button></div></> : <><h2>{isSignup ? "Create your traveler account" : "Log in to Bluebird"}</h2><p>{isSignup ? "Use an email address and password you control. Your password is stored securely." : "Enter your Bluebird email and password to continue."}</p>{error && <div className="error-banner">{error}</div>}<form className="auth-form" onSubmit={submit}>{isSignup && <label className="field"><span>Full name</span><input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Jordan Lee" autoComplete="name" required /></label>}<label className="field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label className="field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 8 : 1} required /></label><button className="primary-button wide-button" type="submit" disabled={submitting}><LockKeyhole size={17} /> {submitting ? "Please wait…" : isSignup ? "Create account" : "Log in"}</button></form><div className="auth-switch">{isSignup ? <>Already have access? <Link href="/login">Log in</Link></> : <>New to Bluebird? <Link href="/signup">Sign up</Link></>}</div></>}</div></main></SiteShell>;
}

function airlineMark(name: string | null | undefined) {
  return (name || "Bluebird Airways").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "BB";
}

function ticketStatusLabel(status: string | null | undefined) {
  return status === "cancelled" ? "Cancelled" : status === "pending" ? "Pending" : "Confirmed";
}

function layoverLabel(value: string | null | undefined) {
  return value === "single_layover" ? "Single layover" : value === "multi_stop" ? "Multi-stop" : "Non-stop";
}

const unpaidWarning = "Thank you for choosing Bluebird Airways. We have received your booking request for your upcoming trip. However, your ticket is not yet fully issued because there is a pending unpaid balance on your flight fee. To secure your seat and completely confirm your flight booking, please pay the remaining balance as soon as possible.";

const airportBackgrounds = [
  "/airport-backgrounds/airport-aerial.jpg",
  "/airport-backgrounds/airport-sunset.jpg",
  "/airport-backgrounds/airport-terminal.jpg",
  "/airport-backgrounds/airport-runway.jpg",
];

export function BookingsPage() {
  const [reference, setReference] = useState("");
  const [lookupReference, setLookupReference] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [airportBackground, setAirportBackground] = useState(airportBackgrounds[0]);
  const lookupQuery = trpc.booking.lookup.useQuery({ reference: lookupReference }, { enabled: lookupReference.length >= 3, retry: false });
  const booking = lookupQuery.data;
  const unpaid = booking ? Math.max(0, Number(booking.amountDue) - Number(booking.amountPaid)) : 0;
  const canPrint = booking?.paymentStatus === "paid" && booking.ticketStatus === "confirmed";
  const customNote = booking?.notes?.trim() && booking.notes.trim() !== unpaidWarning ? booking.notes.trim() : "";
  const submit = (event: FormEvent) => { event.preventDefault(); setSubmitted(true); setLookupReference(reference.trim().toUpperCase()); setAirportBackground(airportBackgrounds[Math.floor(Math.random() * airportBackgrounds.length)]); };
  return <SiteShell watermark={false}><PageIntro eyebrow="MY BOOKINGS" title="Your itinerary, all in one place." copy="Enter the booking reference created for your ticket to see the latest departure, arrival, traveler, and payment details." /><main className="page-wrap section-block narrow-section bookings-page" style={{ backgroundImage: `linear-gradient(180deg, rgba(247,249,252,.96), rgba(247,249,252,.88)), url(${airportBackground})` }}><form className="lookup-card" onSubmit={submit}><div className="lookup-heading"><span className="lookup-icon"><Ticket size={23} /></span><div><p className="card-kicker">LOOK UP A BOOKING</p><h2>Find my booking</h2></div></div><label className="field"><span>Booking reference</span><input value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="e.g. BB-2048" minLength={3} required /><small>Use the custom reference supplied with your ticket.</small></label><button className="primary-button" type="submit"><Search size={17} /> {lookupQuery.isFetching ? "Finding booking…" : "Find my booking"}</button></form>{submitted && lookupReference.length >= 3 && <div className="lookup-result-area">{lookupQuery.isLoading ? <div className="empty-state">Looking for your booking…</div> : lookupQuery.isError ? <div className="empty-state"><span className="empty-icon">!</span><h3>Booking lookup is temporarily unavailable.</h3><p>We could not reach the booking service. Please wait a moment and try the reference again.</p><button className="secondary-button" onClick={() => void lookupQuery.refetch()}>Try again</button></div> : !booking ? <div className="empty-state"><span className="empty-icon">?</span><h3>We could not find that reference.</h3><p>Check the letters and numbers, then try again. If you still need help, visit the Help Centre.</p><Link href="/help" className="text-link navy-link">Visit Help Centre <ArrowRight size={15} /></Link></div> : <article className={`booking-result enriched-ticket ${unpaid > 0 ? "has-unpaid-balance" : ""}`} style={{ backgroundImage: `linear-gradient(180deg, rgba(8,31,70,.90), rgba(8,31,70,.76) 34%, rgba(24,39,58,.98) 63%), url(${airportBackground})` }}><div className="ticket-hero"><div className="ticket-airline"><span className="airline-logo-mark">{booking.airlineLogoUrl ? <img src={booking.airlineLogoUrl} alt="" /> : airlineMark(booking.airlineName)}</span><div><strong>{booking.airlineName || "Airline"}</strong><span>{booking.flightNumber || "Flight number pending"} · {booking.flightClass === "business" ? "Business class" : booking.flightClass === "first" ? "First class" : "Economy"}</span></div></div><div className="ticket-heading-meta"><span className={`ticket-status ticket-status-${booking.ticketStatus || "confirmed"}`}>{ticketStatusLabel(booking.ticketStatus)}</span><span className="ticket-reference">{booking.bookingReference}</span></div></div><div className="ticket-route-panel"><div className="ticket-place"><span className="ticket-overline">DEPARTURE</span><strong>{booking.departureCity}</strong><span>{booking.departureAirport || "Airport pending"}</span><small>{booking.departureTerminal || "Terminal pending"}</small><time>{formatDateTime(booking.departureAt)}</time></div><div className="ticket-route-symbol" aria-label="flight route">✈</div><div className="ticket-place ticket-place-arrival"><span className="ticket-overline">ARRIVAL</span><strong>{booking.arrivalCity}</strong><span>{booking.arrivalAirport || "Airport pending"}</span><small>{booking.arrivalTerminal || "Terminal pending"}</small><time>{formatDateTime(booking.arrivalAt)}</time></div></div><div className="ticket-summary-grid"><div><span>Traveler</span><strong>{booking.travelerName}</strong><small>{booking.travelerCount || 1} traveler{Number(booking.travelerCount || 1) === 1 ? "" : "s"} · {booking.travelerType || "adult"}</small></div><div><span>Layover hub</span><strong>{layoverLabel(booking.layoverHub)}</strong><small>{booking.ticketType === "round_trip" ? "Round trip" : "One way"}</small></div><div><span>Travel time</span><strong>{booking.totalTravelTime || "—"}</strong><small>{booking.totalMiles ? `${Number(booking.totalMiles).toLocaleString()} miles` : "Distance pending"}</small></div><div><span>E-ticket number</span><strong>{booking.eTicketNumber || "—"}</strong><small>Keep this number nearby</small></div></div><div className="ticket-finance-grid"><div><span>Flight fee</span><strong>${Number(booking.amountDue).toFixed(2)}</strong></div><div><span>Amount paid</span><strong>${Number(booking.amountPaid).toFixed(2)}</strong></div><div><span>Amount unpaid</span><strong>${unpaid.toFixed(2)}</strong></div><div><span>Booking date</span><strong>{formatDateTime(booking.bookingAt)}</strong></div></div>{(customNote || unpaid > 0) && <div className="booking-note"><strong>{unpaid > 0 ? "⚠️ Note from Bluebird" : "Note from Bluebird"}</strong>{unpaid > 0 && <p>{unpaidWarning}</p>}{customNote && <p>{customNote}</p>}</div>}<div className="ticket-rules"><div className="ticket-rules-heading"><ShieldCheck size={18} /><div><p className="card-kicker">AIRLINE RULES & REGULATIONS</p><h3>Please read carefully before you fly.</h3></div></div><ul><li>We understand that sometimes plans change. We do not charge a cancel or change fee. When the airline charges such fees in accordance with its own policies, the cost will be passed on to you.</li><li><strong>The 24-Hour Rule:</strong> Under US Department of Transportation regulations, you can cancel any ticket for a full refund within 24 hours of booking, provided you purchased the ticket at least 7 days before the scheduled departure.</li><li>Tickets are nonrefundable if you don’t meet the requirements, nontransferable and name changes are not allowed.</li><li>Please read the rules and regulations carefully.</li></ul></div>{canPrint ? <div className="ticket-actions"><button className="primary-button" onClick={() => window.print()}><Download size={16} /> Download / print PDF</button><span>Paid and confirmed bookings only</span></div> : <div className="ticket-actions ticket-actions-locked"><span>PDF download and printing unlock after the booking is paid and confirmed.</span></div>}</article>}</div>}</main></SiteShell>;
}

export function FlightSearchPage() {
  const [location] = useLocation();
  const params = useMemo(() => new URLSearchParams(location.split("?")[1] || ""), [location]);
  const [from, setFrom] = useState(params.get("from") || ""); const [to, setTo] = useState(params.get("to") || ""); const [date, setDate] = useState(params.get("date") || ""); const [travelers, setTravelers] = useState(params.get("travelers") || "1"); const [submitted, setSubmitted] = useState(Boolean(params.get("from") && params.get("to") && params.get("date")));
  const query = trpc.flights.search.useQuery({ from, to, date, travelers: Number(travelers) }, { enabled: submitted && from.length >= 2 && to.length >= 2 && date.length >= 8, retry: false });
  const submit = (event: FormEvent) => { event.preventDefault(); setSubmitted(true); };
  return <SiteShell><PageIntro eyebrow="SEARCH FLIGHTS" title="Compare the next good departure." copy="Search by city or airport code, choose your travel date, and review the schedules currently available to Bluebird travelers." /><main className="page-wrap section-block"><form className="flight-search-card" onSubmit={submit}><div className="form-grid-three"><label className="field"><span>From city or airport</span><input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="JFK or New York" required /></label><label className="field"><span>To city or airport</span><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="LHR or London" required /></label><label className="field"><span>Departure date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label><label className="field"><span>Travelers</span><select value={travelers} onChange={(e) => setTravelers(e.target.value)}><option value="1">1 traveler</option><option value="2">2 travelers</option><option value="3">3 travelers</option><option value="4">4 travelers</option></select></label></div><button className="primary-button" type="submit"><Search size={17} /> Search available flights</button></form>{submitted && <section className="flight-results">{query.isLoading ? <div className="empty-state">Searching schedules…</div> : query.isError ? <div className="empty-state"><h3>Flight search is temporarily unavailable.</h3><p>Try again with a city name or three-letter airport code.</p></div> : <><div className="results-heading"><div><p className="card-kicker">{query.data?.source === "live" ? "LIVE SCHEDULES" : "BLUEBIRD SCHEDULE GUIDE"}</p><h2>{query.data?.flights.length || 0} routes found</h2></div><span>{date}</span></div><div className="flight-result-list">{query.data?.flights.map((flight, index) => <article className="flight-result-row" key={`${flight.flightNumber}-${index}`}><div className="flight-airline-small"><span className="airline-logo-mark">{airlineMark(flight.airline)}</span><div><strong>{flight.airline}</strong><small>{flight.flightNumber}</small></div></div><div className="flight-time"><strong>{flight.departure}</strong><span>{flight.fromCode}</span></div><div className="flight-line"><Plane size={17} /><span>{flight.duration}</span></div><div className="flight-time"><strong>{flight.arrival}</strong><span>{flight.toCode}</span></div><div className="flight-stop"><strong>{flight.stops}</strong><small>{flight.live ? "Live schedule" : "Typical schedule"}</small></div><div className="flight-price">{flight.price === null ? <strong>See airline</strong> : <><small>from</small><strong>${flight.price}</strong></>}<Link href={`/plan-route?from=${encodeURIComponent(flight.fromName)}&to=${encodeURIComponent(flight.toName)}&date=${encodeURIComponent(date)}&flight=${encodeURIComponent(flight.flightNumber)}&price=${encodeURIComponent(String(flight.price ?? ""))}`} className="secondary-button">Plan route</Link></div></article>)}</div><p className="results-note">Schedules and prices can change. Official tickets are created and confirmed by the owner in the Bluebird console.</p></>}</section>}</main></SiteShell>;
}


export function PlanRoutePage() {
  const [location] = useLocation();
  const params = useMemo(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : location.split("?")[1] || ""), [location]);
  const from = params.get("from") || "your departure city";
  const to = params.get("to") || "your destination";
  const date = params.get("date") || "your preferred date";
  const flight = params.get("flight");
  const price = params.get("price");
  const subject = `Bluebird flight booking request: ${from} to ${to}`;
  const body = `Hello Bluebird Airways,\n\nI would like to book a flight.\n\nFrom: ${from}\nTo: ${to}\nDeparture date: ${date}${flight ? `\nPreferred flight: ${flight}` : ""}${price ? `\nDisplayed fare: $${price}` : ""}\n\nPlease send me the next steps.\n\nThank you.`;
  const emailHref = `mailto:Loverela@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return <SiteShell><PageIntro eyebrow="PLAN YOUR ROUTE" title="A clear next step to take off." copy="Tell Bluebird where you want to go and our booking team will help turn your route into a confirmed ticket." /><main className="page-wrap section-block"><div className="plan-route-layout"><section className="plan-route-card"><p className="card-kicker">YOUR ROUTE REQUEST</p><h2>{from} <span>→</span> {to}</h2><div className="route-request-meta"><div><span>DEPARTURE DATE</span><strong>{date}</strong></div>{flight && <div><span>PREFERRED FLIGHT</span><strong>{flight}</strong></div>}{price && <div><span>DISPLAYED FARE</span><strong>${price}</strong></div>}</div><p className="plan-route-copy">Send us an email to book your flight now. Include any traveler details, preferred timing, and questions so the Bluebird team can prepare your booking.</p><a className="primary-button plan-route-email" href={emailHref}><Mail size={18} /> Send us an email to book your flight now</a></section><aside className="plan-route-aside"><span className="owner-note-icon"><ShieldCheck size={20} /></span><p className="card-kicker">HUMAN REVIEW</p><h3>Every route gets a considered reply.</h3><p>Bluebird tickets are owner-managed. We review your request, confirm availability and pricing, then send a clear booking reference for your trip.</p><Link href="/bookings" className="text-link navy-link">Already have a reference? <ArrowRight size={15} /></Link></aside></div></main></SiteShell>;
}

export function BookPage() {
  const [location, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(location.split("?")[1] || ""), [location]);
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [passengerType, setPassengerType] = useState("Adult");
  const [passengers, setPassengers] = useState("1");
  const [passengerDetails, setPassengerDetails] = useState([{ fullName: "", gender: "" }]);
  const [layoverHub, setLayoverHub] = useState("Non-Stop");
  const [from, setFrom] = useState(params.get("from") || "");
  const [to, setTo] = useState(params.get("to") || "Los Angeles, CA");
  const [depart, setDepart] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [flightType, setFlightType] = useState("One Way");
  const [travelClass, setTravelClass] = useState("Show all");
  const [currentLocation, setCurrentLocation] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const detectCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const response = await fetch("https://ipapi.co/json/");
      if (!response.ok) throw new Error("Location unavailable");
      const data = await response.json() as { city?: string; region?: string; country_name?: string };
      const label = [data.city, data.region, data.country_name].filter(Boolean).join(", ") || "Current location";
      setCurrentLocation(label);
      setFrom((value) => value || label);
    } catch {
      setCurrentLocation("Current location");
      setFrom((value) => value || "Current location");
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => { void detectCurrentLocation(); }, []);

  const updatePassengerCount = (value: string) => {
    setPassengers(value);
    const count = Number(value);
    setPassengerDetails((current) => Array.from({ length: count }, (_, index) => current[index] || { fullName: "", gender: "" }));
  };

  const updatePassenger = (index: number, key: "fullName" | "gender", value: string) => {
    setPassengerDetails((current) => current.map((passenger, passengerIndex) => passengerIndex === index ? { ...passenger, [key]: value } : passenger));
  };

  const searchFlights = () => {
    const searchParams = new URLSearchParams({ from, to, date: depart, travelers: passengers, class: travelClass, flightType, layoverHub, returnDate });
    navigate(`/search-flights?${searchParams.toString()}`);
  };

  return <SiteShell><PageIntro eyebrow="BOOK A FLIGHT" title="Plan the route. We’ll keep the details clear." copy="Add traveler details, choose your route and dates, then review matching flight schedules." /><main className="page-wrap section-block book-page-content"><form className="planner-card booking-planner-card" onSubmit={(event) => { event.preventDefault(); searchFlights(); }}><div className="planner-top"><div><p className="card-kicker">FLIGHT PLANNER</p><h2>Book a flight</h2></div><span className="planner-badge"><Globe2 size={15} /> Worldwide routes</span></div><div className="booking-form-grid traveler-primary-grid"><label className="field"><span>Full Name</span><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" required /></label><label className="field"><span>Gender</span><select value={gender} onChange={(e) => setGender(e.target.value)} required><option value="">Select</option><option value="M">M</option><option value="F">F</option></select></label><label className="field"><span>Phone number</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" required /></label><label className="field"><span>Passenger</span><select value={passengerType} onChange={(e) => setPassengerType(e.target.value)}><option>Adult</option><option>Youth</option><option>Teenager</option><option>Adult&Kids</option></select></label><label className="field"><span>Number of Passengers</span><select value={passengers} onChange={(e) => updatePassengerCount(e.target.value)}>{Array.from({ length: 9 }, (_, index) => <option key={index + 1} value={String(index + 1)}>{index + 1}</option>)}</select></label><label className="field"><span>Layover Hub</span><select value={layoverHub} onChange={(e) => setLayoverHub(e.target.value)}><option>Non-Stop</option><option>Single Layover</option><option>Multi-stop</option></select></label></div>{Number(passengers) > 1 && <section className="passenger-details-section"><div className="passenger-details-heading"><p className="card-kicker">ADDITIONAL PASSENGERS</p><span>Enter a full name and gender for each traveler.</span></div><div className="passenger-details-grid">{passengerDetails.slice(1).map((passenger, index) => <div className="passenger-detail-card" key={index + 1}><strong>Passenger {index + 2}</strong><label className="field"><span>Full Name</span><input value={passenger.fullName} onChange={(e) => updatePassenger(index + 1, "fullName", e.target.value)} placeholder="Full name" required /></label><label className="field"><span>Gender</span><select value={passenger.gender} onChange={(e) => updatePassenger(index + 1, "gender", e.target.value)} required><option value="">Select</option><option value="M">M</option><option value="F">F</option></select></label></div>)}</div></section>}<div className="booking-form-grid route-details-grid"><label className="field"><span>From</span><input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Use current city and state" required /><button type="button" className="field-location-button" onClick={() => void detectCurrentLocation()}>{locationLoading ? "Finding current location…" : "Use current location"}</button></label><label className="field"><span>To</span><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Los Angeles, CA" required /><button type="button" className="field-location-button" onClick={() => setTo(currentLocation || from || "Current location")}>Use current location</button></label><label className="field"><span>Flight type</span><select value={flightType} onChange={(e) => setFlightType(e.target.value)}><option>One Way</option><option>Round Trip</option></select></label><label className="field"><span>Depart</span><input type="date" value={depart} onChange={(e) => setDepart(e.target.value)} aria-label="Departure date in month, day, year format" required /><button type="button" className="field-location-button calendar-button" onClick={(e) => { const input = e.currentTarget.previousElementSibling as HTMLInputElement | null; input?.showPicker?.(); }}>View Calendar</button></label>{flightType === "Round Trip" && <label className="field"><span>Return</span><input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} aria-label="Return date in month, day, year format" required /><button type="button" className="field-location-button calendar-button" onClick={(e) => { const input = e.currentTarget.previousElementSibling as HTMLInputElement | null; input?.showPicker?.(); }}>View Calendar</button></label>}<label className="field"><span>Class</span><select value={travelClass} onChange={(e) => setTravelClass(e.target.value)}><option>Show all</option><option>Economy</option><option>Business Class</option><option>First Class</option></select></label></div><div className="booking-form-footer"><p>Review your route and traveler details on the Search Flights page.</p><button type="submit" className="primary-button"><Search size={17} /> Book a flight</button></div></form></main></SiteShell>;
}

export function DestinationsPage() {
  const [search, setSearch] = useState("");
  const filteredGroups = regionGroups.map((group) => ({ ...group, countries: group.countries.filter((country) => country.toLowerCase().includes(search.toLowerCase())) })).filter((group) => group.countries.length > 0);
  return <SiteShell><PageIntro eyebrow="DESTINATIONS" title="A map that keeps getting wider." copy="Explore the countries already on the Bluebird map, then use worldwide city and state details when your route takes you somewhere new." /><main className="page-wrap section-block"><div className="destination-tools"><div><p className="card-kicker">{americanCountries.length + 1} DESTINATION COUNTRIES</p><h2>Start with the Americas.</h2></div><label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search countries" /></label></div><div className="destination-directory">{filteredGroups.map((group) => <section className="country-group" key={group.label}><div className="country-group-heading"><MapPin size={18} /><h3>{group.label}</h3></div><div className="country-pills">{group.countries.map((country) => <Link key={country} href={`/book?to=${encodeURIComponent(country)}`} className="country-pill">{country}<ArrowRight size={14} /></Link>)}</div></section>)}</div><div className="worldwide-callout"><span><Globe2 size={23} /></span><div><p className="card-kicker">WORLDWIDE CITY + STATE INPUTS</p><h3>Your itinerary is not limited to this directory.</h3><p>Owner booking forms accept any city, state or province, and country in the world.</p></div><Link href="/book" className="secondary-button">Plan a route <ArrowRight size={16} /></Link></div></main></SiteShell>;
}

export function SimpleInfoPage({ kind }: { kind: "about" | "help" }) {
  const isAbout = kind === "about";
  return <SiteShell><PageIntro eyebrow={isAbout ? "ABOUT BLUEBIRD" : "HELP CENTRE"} title={isAbout ? "A small airline feeling, wherever you go." : "Clear answers before takeoff."} copy={isAbout ? "Bluebird is an owner-managed travel experience built around calm details, practical access, and the belief that every journey deserves a human eye." : "Find the fastest path to your booking details, owner contact, and the information you need for your next step."} /><main className="page-wrap section-block"><div className="info-layout"><section className="info-main"><div className="eyebrow"><span className="eyebrow-line" /> {isAbout ? "THE BLUEBIRD POINT OF VIEW" : "START HERE"}</div><h2>{isAbout ? "Travel is better when the details feel considered." : "Most answers start with your booking reference."}</h2><p>{isAbout ? "From a custom booking reference to a clear view of departure, arrival, and payment, Bluebird keeps the operational parts of a journey easy to follow. The owner console is protected; the traveler experience stays simple." : "On My Bookings, enter the exact reference your owner supplied. You will see the live ticket details that were created or most recently edited in the owner console."}</p>{isAbout ? <div className="quote-block">“Clear details. Calmer travel.”<span>— the Bluebird promise</span></div> : <div className="help-links"><Link href="/bookings" className="help-link"><Ticket size={19} /><span><strong>Find my booking</strong><small>Look up your reference and itinerary.</small></span><ArrowRight size={16} /></Link><Link href="/admin" className="help-link"><ShieldCheck size={19} /><span><strong>Owner console</strong><small>Create and maintain flight tickets.</small></span><ArrowRight size={16} /></Link><Link href="/login" className="help-link"><LockKeyhole size={19} /><span><strong>Login or sign up</strong><small>Use your secure Bluebird email and password.</small></span><ArrowRight size={16} /></Link></div>}</section><aside className="info-aside"><Clock3 size={21} /><h3>{isAbout ? "Built for the in-between moments." : "Need a hand?"}</h3><p>{isAbout ? "The moments before you leave, while you check a detail, and when you need to know what comes next." : "If a reference is not working, check its spelling first. Then reach out to the owner managing your ticket."}</p><Link href="/bookings" className="text-link navy-link">Go to My Bookings <ArrowRight size={15} /></Link></aside></div></main></SiteShell>;
}
