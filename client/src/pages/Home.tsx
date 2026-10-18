import { ArrowRight, CalendarCheck, CheckCircle2, ChevronRight, Globe2, Headphones, MapPin, Search, ShieldCheck, Sparkles, TicketCheck } from "lucide-react";
import { Link } from "wouter";
import { FlightBookingForm } from "@/components/FlightBookingForm";
import { SiteShell } from "@/components/SiteShell";

const featuredDestinations = [
  { city: "New York", country: "United States", code: "JFK", className: "destination-nyc" },
  { city: "London", country: "United Kingdom", code: "LHR", className: "destination-london" },
  { city: "Toronto", country: "Canada", code: "YYZ", className: "destination-toronto" },
  { city: "São Paulo", country: "Brazil", code: "GRU", className: "destination-saopaulo" },
];

export default function Home() {
  return (
    <SiteShell>
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="page-wrap hero-content">
          <div className="eyebrow light-eyebrow"><span className="eyebrow-line" /> BLUEBIRD AIRWAYS</div>
          <h1>Fly further.<br /><span>Feel closer.</span></h1>
          <p className="hero-copy">Book direct flights, keep your itinerary close, and discover the places that make the journey worthwhile.</p>
          <div className="hero-links">
            <Link href="/bookings" className="text-link light-link">Find my booking <ArrowRight size={16} /></Link>
            <Link href="/destinations" className="text-link light-link">Explore destinations <ChevronRight size={16} /></Link>
          </div>

          <FlightBookingForm mode="home" />
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
              <div className="promise-item"><span className="promise-icon"><ShieldCheck size={22} /></span><h3>Direct flights</h3><p>Simple connections from the places you know to the places you want to discover.</p></div>
              <div className="promise-item"><span className="promise-icon"><TicketCheck size={22} /></span><h3>Clear booking details</h3><p>Find your itinerary anytime with the booking reference you receive.</p></div>
              <div className="promise-item"><span className="promise-icon"><Headphones size={22} /></span><h3>Travel your way</h3><p>Choose the route and ticket details that fit the way you want to travel.</p></div>
              <div className="promise-item"><span className="promise-icon"><Globe2 size={22} /></span><h3>European horizons</h3><p>Discover cities, islands, and familiar gateways across a growing map.</p></div>
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

        <section className="newsletter-section">
          <div className="page-wrap newsletter-inner">
            <div><div className="eyebrow light-eyebrow"><span className="eyebrow-line" /> BE THE FIRST TO KNOW</div><h2>Good routes, sent occasionally.</h2><p>Get new destinations, seasonal offers, and useful travel updates from Bluebird Airways.</p></div>
            <form className="newsletter-form" onSubmit={(event) => event.preventDefault()}><input type="email" placeholder="Your email address" aria-label="Email address" required /><button className="primary-button" type="submit">Subscribe <ArrowRight size={16} /></button><small>By subscribing, you agree to receive Bluebird travel updates.</small></form>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
