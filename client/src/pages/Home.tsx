import { FormEvent, useState } from "react";
import { ArrowRight, CalendarCheck, CheckCircle2, ChevronRight, Globe2, Headphones, MapPin, Search, ShieldCheck, Sparkles, TicketCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { SiteShell } from "@/components/SiteShell";

const featuredDestinations = [
  { city: "New York", country: "United States", code: "JFK", className: "destination-nyc" },
  { city: "London", country: "United Kingdom", code: "LHR", className: "destination-london" },
  { city: "Toronto", country: "Canada", code: "YYZ", className: "destination-toronto" },
  { city: "São Paulo", country: "Brazil", code: "GRU", className: "destination-saopaulo" },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [trip, setTrip] = useState("roundtrip");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (date) params.set("date", date);
    params.set("trip", trip);
    navigate(`/book?${params.toString()}`);
  };

  return (
    <SiteShell>
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="page-wrap hero-content">
          <div className="eyebrow light-eyebrow"><span className="eyebrow-line" /> BLUEBIRD AIRWAYS</div>
          <h1>Your next horizon<br /><span>starts here.</span></h1>
          <p className="hero-copy">Thoughtfully connected journeys, owner-managed with care. Find your route and keep every flight detail within reach.</p>
          <div className="hero-links">
            <Link href="/bookings" className="text-link light-link">Find my booking <ArrowRight size={16} /></Link>
            <Link href="/destinations" className="text-link light-link">Explore destinations <ChevronRight size={16} /></Link>
          </div>

          <form className="search-panel" onSubmit={handleSearch}>
            <div className="search-tabs" role="tablist" aria-label="Trip type">
              {[['roundtrip', 'Round trip'], ['oneway', 'One way']].map(([value, label]) => (
                <button type="button" key={value} className={`search-tab ${trip === value ? "active" : ""}`} onClick={() => setTrip(value)}>{label}</button>
              ))}
            </div>
            <div className="search-fields">
              <label className="field field-route"><span>From</span><input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="City or airport" /></label>
              <div className="route-arrow" aria-hidden="true">→</div>
              <label className="field field-route"><span>To</span><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="City or airport" /></label>
              <label className="field"><span>Departure</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label className="field field-passengers"><span>Passengers</span><select defaultValue="1"><option>1 traveler</option><option>2 travelers</option><option>3 travelers</option><option>4+ travelers</option></select></label>
              <button className="primary-button search-button" type="submit"><Search size={18} /> Search flights</button>
            </div>
            <p className="search-note"><Sparkles size={14} /> Search is your starting point. Final tickets are created and maintained in the owner console.</p>
          </form>
        </div>
      </section>

      <main>
        <section className="page-wrap section-block offers-section">
          <div className="section-heading split-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" /> CURATED FOR THE JOURNEY</div><h2>Travel with a little more room to breathe.</h2></div>
            <Link href="/book" className="text-link navy-link">Book a flight <ArrowRight size={16} /></Link>
          </div>
          <div className="offer-grid">
            <article className="offer-card offer-card-featured"><div className="offer-art art-sunset"><span>01</span><strong>Coast to coast</strong></div><div className="offer-copy"><p className="card-kicker">UNITED STATES</p><h3>Open skies, easy connections.</h3><p>Settle into a journey designed around your time, not the other way around.</p><Link href="/destinations" className="text-link navy-link">Explore routes <ArrowRight size={15} /></Link></div></article>
            <article className="offer-card"><div className="offer-art art-atlas"><span>02</span><strong>Atlantic edit</strong></div><div className="offer-copy"><p className="card-kicker">UNITED KINGDOM</p><h3>Arrive ready for the city.</h3><p>Thoughtful details from takeoff to touchdown across the Atlantic.</p><Link href="/destinations" className="text-link navy-link">See destinations <ArrowRight size={15} /></Link></div></article>
            <article className="offer-card"><div className="offer-art art-tropical"><span>03</span><strong>Southern light</strong></div><div className="offer-copy"><p className="card-kicker">SOUTH AMERICA</p><h3>Find your warmer horizon.</h3><p>From Brazil to the Andes, keep the full itinerary close at hand.</p><Link href="/destinations" className="text-link navy-link">Explore the map <ArrowRight size={15} /></Link></div></article>
          </div>
        </section>

        <section className="band-section">
          <div className="page-wrap section-block">
            <div className="section-heading centered-heading"><div className="eyebrow"><span className="eyebrow-line" /> THE BLUEBIRD PROMISE</div><h2>Clear details. Calmer travel.</h2><p>Everything you need, from the first search to the booking reference in your hand.</p></div>
            <div className="promise-grid">
              <div className="promise-item"><span className="promise-icon"><ShieldCheck size={22} /></span><h3>Owner-managed care</h3><p>Each ticket is created and maintained with a human eye on the details.</p></div>
              <div className="promise-item"><span className="promise-icon"><TicketCheck size={22} /></span><h3>One clear reference</h3><p>Find your itinerary anytime with the booking reference you receive.</p></div>
              <div className="promise-item"><span className="promise-icon"><Headphones size={22} /></span><h3>Here when you need us</h3><p>Questions about a route, time, or payment status? Start in the Help Centre.</p></div>
              <div className="promise-item"><span className="promise-icon"><Globe2 size={22} /></span><h3>Routes without borders</h3><p>City, state, and country fields support journeys all over the world.</p></div>
            </div>
          </div>
        </section>

        <section className="page-wrap section-block destinations-section" id="destinations">
          <div className="section-heading split-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> WHERE WILL YOU GO?</div><h2>Made for the map in your mind.</h2></div><Link href="/destinations" className="text-link navy-link">View all destinations <ArrowRight size={16} /></Link></div>
          <div className="destination-grid">{featuredDestinations.map((destination) => <Link href={`/destinations?country=${encodeURIComponent(destination.country)}`} className={`destination-card ${destination.className}`} key={destination.code}><div className="destination-overlay" /><div className="destination-content"><span>{destination.code}</span><strong>{destination.city}</strong><small>{destination.country}</small></div></Link>)}</div>
        </section>

        <section className="page-wrap section-block quick-section">
          <div className="quick-intro"><div className="eyebrow"><span className="eyebrow-line" /> AT A GLANCE</div><h2>Take the next step.</h2><p>From finding your booking to exploring a new route, the right door is close by.</p></div>
          <div className="quick-grid">
            <Link href="/book" className="quick-card"><span className="quick-number">01</span><span className="quick-icon"><Search size={22} /></span><strong>Search flights</strong><small>Plan a route and prepare your trip details.</small><ArrowRight size={17} /></Link>
            <Link href="/bookings" className="quick-card"><span className="quick-number">02</span><span className="quick-icon"><CalendarCheck size={22} /></span><strong>Manage booking</strong><small>Look up departure, arrival, and payment details.</small><ArrowRight size={17} /></Link>
            <Link href="/help" className="quick-card"><span className="quick-number">03</span><span className="quick-icon"><CheckCircle2 size={22} /></span><strong>Check-in & help</strong><small>Get answers before the day of departure.</small><ArrowRight size={17} /></Link>
            <Link href="/destinations" className="quick-card"><span className="quick-number">04</span><span className="quick-icon"><MapPin size={22} /></span><strong>Destinations</strong><small>Browse the countries and cities in the Bluebird map.</small><ArrowRight size={17} /></Link>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
