# Bluebird Airways implementation plan

## Product scope

Turn the supplied Bluebird Airways mockup into a working, database-backed travel website. Preserve the mockup's navy/cobalt/cream visual language and make every primary navigation item, Login, Sign Up, My Bookings, Book a Flight, and homepage quick action lead to a useful destination. Use Manus OAuth for traveler authentication. Use a database-backed role model so the owner is the only person who can create and edit ticket records; travelers can search for owner-created records by booking reference.

## Implementation approach

- **Frontend:** React + TypeScript + Wouter, reusing the initialized web-db-user starter and building a small route-aware application shell with responsive navigation, landing page sections, public lookup, auth entry page, destination explorer, booking request guidance, and owner admin dashboard.
- **Backend:** tRPC procedures in `server/routers.ts` for public booking lookup and protected owner operations. Public lookup returns only the record matching an exact booking reference. Admin list/create/update procedures require an authenticated user whose database role is `admin`.
- **Persistence:** Extend `drizzle/schema.ts` with a `flightBookings` table containing a custom booking reference, traveler identity, worldwide origin/destination city/state/country fields, departure/arrival date-times, amount due, amount paid, payment status, notes, and timestamps. Add a committed additive migration and run the migration against the selected managed database.
- **Authorization:** Keep the starter Manus OAuth session. Add a one-time owner claim flow: the first authenticated account may claim owner access only while no admin exists; after that, the database role is the sole authorization source. If `OWNER_OPEN_ID` is configured, it is honored as the owner identity. All booking mutations and admin reads require the owner role.
- **Destinations:** Include USA, United Kingdom, Canada, every North and South American country in a curated destination directory, plus worldwide free-form city/state/country fields in admin booking forms.
- **Validation:** Use Zod on tRPC input, normalize booking references to uppercase, require valid schedule ordering and non-negative money fields, and enforce unique references with a friendly error.
- **Frontend data flow:** Use the generated tRPC hooks. Public booking lookup does not require login; admin dashboard requires Manus OAuth and then shows a claim-owner state or the protected booking workspace. Mutations invalidate admin list and lookup caches so edits immediately appear to travelers.

## Project structure

- `client/src/App.tsx`: route manifest and shared shell.
- `client/src/pages/Home.tsx`: mockup-inspired homepage with working search card, offers, destinations, and quick actions.
- `client/src/pages/PublicPages.tsx`: Login/Sign Up, My Bookings, Book a Flight, Destinations, and informational pages.
- `client/src/pages/Admin.tsx`: owner claim/login gate and create/edit booking workspace.
- `client/src/index.css`: Bluebird visual system and responsive layout.
- `server/routers.ts`: booking and owner tRPC procedures.
- `server/db.ts`: booking queries and role/owner helpers.
- `drizzle/schema.ts` + `drizzle/0001_bookings.sql`: persistent booking schema.
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
- **Animation:** Subtle lift on cards, short opacity/translate transitions for page content, and no decorative motion that competes with dates, times, prices, or references.
- **Typography System:** System sans stack for compact operational clarity; oversized navy display headlines, small tracked uppercase labels, and tabular-feeling numerals for booking data.
- **Brand Essence:** Calm, owner-managed flight coordination for travelers who want the details to be clear; dependable, composed, human.
- **Brand Voice:** Headlines are warm and direct (“Your next horizon starts here.”). CTAs are specific (“Find my booking”, “Open owner console”).
- **Wordmark & Logo:** A circular blue flight marker with a white bird silhouette, paired with a compact Bluebird Airways wordmark.
- **Signature Brand Color:** Bluebird cobalt `#19458C`.
