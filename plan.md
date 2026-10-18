# Bluebird Airways implementation plan

## Product scope

Turn the supplied Bluebird Airways mockup into a working, database-backed travel website. Preserve the mockup's navy/cobalt/cream visual language and make every primary navigation item, Login, Sign Up, My Bookings, Book a Flight, and homepage quick action lead to a useful destination. Use Manus OAuth for traveler authentication. Use a database-backed role model so the owner is the only person who can create and edit ticket records; travelers can search for owner-created records by booking reference. Travelers can select a live Duffel offer and submit a booking request for owner review; this request workflow does not place an airline order, issue a ticket, or collect payment.

## Implementation approach

- **Frontend:** React + TypeScript + Wouter, reusing the existing application and building a route-aware shell, public booking search/request flow, public lookup, authentication pages, destination explorer, and owner console.
- **Backend:** tRPC procedures in `server/routers.ts` for public booking lookup and request submission, plus owner-protected ticket and request management operations. Public lookup returns only the exact booking reference; owner inbox procedures protect request PII.
- **Persistence:** Existing PostgreSQL `flight_bookings` and `flight_schedules` remain intact. Add a `flight_requests` table with an opaque request reference, contact details, passenger list, search route, server-refreshed selected-offer snapshot, owner status/notes, and timestamps. Railway's existing pre-deploy `db:sync` keeps the schema synchronized.
- **Authorization:** Keep the existing session and database-backed owner role. All request inbox reads and status/notes updates require the owner role. Public travelers may submit only a request, not create or modify tickets.
- **Flight request flow:** Keep traveler/contact data in a validated, session-scoped browser draft rather than URL parameters. Before storing a request, retrieve the selected offer again from Duffel, reject expired or unavailable offers and any fare change that requires the traveler to choose again, verify the route/passenger count, and store only provider-returned fare and segment data. Then show the refreshed fare and a receipt with a high-entropy unique reference. State clearly that this does not reserve inventory, guarantee the fare, issue a ticket, or charge the traveler.
- **Flight search form:** Reuse one responsive form on the homepage, `/book`, and the Duffel availability page. It collects only the requested passenger/contact, passenger category/count, layover preference, route, flight type, and dates. Round trips require a return date; one-way searches omit it. Duffel Place Suggestions resolve city/airport selections to IATA codes. IP-derived origin is approximate; explicit current-location actions use browser geolocation permission. Keep names and phone numbers in session storage, never URL parameters.
- **Destinations:** Include USA, United Kingdom, Canada, every North and South American country in a curated destination directory, plus worldwide free-form city/state/country fields in admin booking forms.
- **Validation:** Use Zod on tRPC input, normalize booking references to uppercase, require valid schedule ordering and non-negative money fields, enforce unique references, and validate request contact/passenger/route/offer fields and matching passenger counts.
- **Frontend data flow:** Use generated tRPC hooks. Public booking lookup and booking-request submission do not require login; the owner dashboard and request inbox require an authenticated user whose database role is `admin`.

## Project structure

- `client/src/App.tsx`: route manifest and shared shell.
- `client/src/pages/Home.tsx`: mockup-inspired homepage with the shared location-aware booking form, offers, destinations, and quick actions.
- `client/src/pages/PublicPages.tsx`: Login/Sign Up, My Bookings, Destinations, and informational pages. `BookPage.tsx` and `FlightAvailability.tsx` implement the planner and live offer selection.
- `client/src/pages/BookingRequest.tsx`: traveler review, request submission, and receipt.
- `client/src/components/FlightRequestInbox.tsx`: owner-only booking request triage.
- `client/src/components/FlightBookingForm.tsx` and `PlacePicker.tsx`: shared passenger/route/date form and Duffel-backed city/airport suggestions.
- `client/src/pages/Admin.tsx`: owner claim/login gate and create/edit ticket workspace.
- `client/src/index.css`: Bluebird visual system and responsive layout.
- `server/routers.ts`: booking, request, schedule, authentication, and owner tRPC procedures.
- `server/db.ts`: PostgreSQL booking/request queries and owner helpers.
- `drizzle/schema.ts` and `drizzle-pg/`: database schema and SQL deployment history.
- `shared/bookingRequest.ts`: shared request input validation and data types.
- `client/public/manus-routes.json`: complete public route manifest.

## Design direction

### Alternatives considered

- **Aviation editorial / airport lounge** — probability 0.07.
- **Quiet luxury travel journal** — probability 0.06.
- **Bold budget airline utility** — probability 0.04.

### Chosen: aviation editorial / airport lounge

- **Design Movement:** An aviation editorial interface: crisp airport wayfinding, premium lounge calm, and the structured clarity of a boarding pass.
- **Core Principles:** Immediate orientation, generous breathing room, high contrast for travel-critical data, and confident but restrained motion.
- **Color Philosophy:** Deep navy anchors trust and long-haul calm; cobalt carries action and wayfinding; cream is a warm counterpoint that keeps the experience from feeling corporate or cold.
- **Layout Paradigm:** A wide, left-weighted travel narrative with layered search panels and staggered content bands rather than a generic centered dashboard grid.
- **Signature Elements:** Rounded “boarding pass” data panels, thin route lines with circular airport markers, and small uppercase eyebrow labels for itinerary metadata.
- **Interaction Philosophy:** Every click should either move the traveler toward a destination or reveal a precise next step. Forms use explicit labels, helpful defaults, and status feedback instead of hidden behavior.
- **Animation:** Subtle lift on cards, short opacity/translate transitions for page content, and no decorative motion that competes with dates, times, prices, references, or request status.
- **Typography System:** System sans stack for compact operational clarity; oversized navy display headlines, small tracked uppercase labels, and tabular-feeling numerals for booking data.
- **Brand Essence:** Calm, owner-managed flight coordination for travelers who want the details to be clear; dependable, composed, human.
- **Brand Voice:** Headlines are warm and direct (“Your next horizon starts here.”). CTAs are specific (“Find my booking”, “Open owner console”).
- **Wordmark & Logo:** A circular blue flight marker with a white bird silhouette, paired with a compact Bluebird Airways wordmark.
- **Signature Brand Color:** Bluebird cobalt `#19458C`.
