## Expanded airline ticket details
- [x] The owner-console flight booking form is organized into traveler details, airline and ticket, airports and route, schedule and ticket identity, and payment and status sections.
- [x] Traveler fields include traveler name, traveler type (Adult, Kid, Teenager), number of travelers, and seat number.
- [x] Airline fields include airline name with an automatic initials logo mark, flight number accepting formats such as AB123, one-way or round-trip ticket type, and Economy, Business class, or First class.
- [x] Airport fields include departure and arrival airport names/codes, terminal names, city, state/province, and country.
- [x] Schedule fields include departure and arrival date/time, total travel time, total miles, booking date/time, and an alphanumeric E-ticket number.
- [x] Ticket status supports Confirmed, Pending, and Cancelled; the form uses Flight Fee, Amount Paid, and derived Amount Unpaid labels.

## Traveler ticket presentation and rules
- [x] Booking lookup results show the airline, generated airline mark, flight number/class, ticket status, passenger summary, seat, ticket type, E-ticket number, flight fee, paid and unpaid amounts, booking date, airports/terminals, and schedule details.
- [x] The departure-to-arrival connection is indicated with an airplane symbol, and the ticket uses a photorealistic generated airport/city background.
- [x] The traveler result no longer shows a Last Updated field.
- [x] The traveler result includes the requested Airline Rules & Regulations, including the no Bluebird cancel/change fee statement, the 24-hour US DOT rule, nonrefundable/nontransferable/name-change restrictions, and the instruction to read carefully.

## Live flight booking request
- [x] The Book a Flight planner accepts three-letter airport IATA codes for Duffel search, collects contact name, email, phone, and passenger names/genders, validates temporary session drafts, and keeps these details in session storage rather than URL parameters while the traveler searches. If the browser blocks session storage, it must not navigate without a recoverable draft.
- [x] Each live offer has a “Send booking request →” action that opens a request-review page showing the selected airline, fare and currency, route segments, dates, passenger count, and passenger/contact information, with the ability to correct contact/passenger details before submission.
- [x] The traveler-review page does not show an owner-inbox save control and does not depend on a database write to prepare or send a traveler email.
- [x] The request-review page offers “Send Booking Request to Bluebird” directly from the traveler details form, opening a prefilled email to love4rela@gmail.com with contact and traveler details, selected route, dates, fare, and itinerary. After the traveler clicks the email button, show an “Email draft ready” confirmation that tells them to press Send in their email app and does not claim that email delivery was verified.
- [x] Hide traveler-facing browser-session/seat/payment copy, offer expiry information, and the Duffel/owner-review disclaimer from flight-search and request-review pages.

## Owner request inbox
- [x] Only authenticated users with the database-backed owner/admin role can list request contact/passenger PII, view the selected offer snapshot, or change request status and internal notes.
- [x] The owner console displays new requests with reference, route, departure date, fare snapshot, contact details, passenger list, and status; the owner can mark each request New, Contacted, or Closed and save an internal note.

## Revised homepage and Duffel flight-search form
- [x] The homepage Book a Flight form and `/book` page use only these trip-search fields: Full Name; Gender with M/F; Phone number; Passenger category Adult, Youth, Teenager, or Adult&Kids; Number of Passengers 1 through 9; Layover Hub Non-Stop, Single Layover, or Multi-stop; From; To; Flight type One Way or Round Trip; Depart; and, only for Round Trip, Return.
- [x] When Number of Passengers is greater than 1, show Full Name and Gender fields for every additional passenger. Adult&Kids assigns the first passenger as adult and the remaining passengers as kids.
- [x] The origin is suggested from the current IP city/state. Both From and To provide a Use current location action. To defaults to Los Angeles, CA. City/airport suggestions resolve to valid Duffel IATA codes before a live search. Do not show travelers the notice “A third-party IP lookup suggests an approximate city/state. Device location requires browser permission.”
- [x] Round Trip displays a required Return Date field; One Way hides it and excludes the return slice. Depart and Return dates are presented in MM/DD/YYYY format, and return must be after departure.
- [x] The Duffel availability page uses the same passenger/contact, trip type, route, dates, passenger-count, and layover information; it displays the selected passenger details and preserves them only in session storage, not in URL parameters.

## Duffel integration diagnostics and search feedback
- [x] Use Duffel Places suggestions to resolve a selected city or airport to its three-letter `iata_code`; if From or To is unresolved, identify the exact field and allow a typed three-letter IATA code as an alternative. If lookup is unconfigured or fails, show a helpful explanation rather than only a generic selection error.
- [x] Send the selected destination in the outbound Duffel slice and, for Round Trip, add a second slice with origin and destination reversed. Put `supplier_timeout` in the documented offer-request query parameters, not the JSON body.
- [x] The Search Flights and Duffel availability results show an animated loading spinner, prevent duplicate submits while loading, and show an actionable error with a retry action when a request fails.
- [x] After `DUFFEL_API_KEY` was configured in Railway, live production city suggestions returned HTTP 200 and a live offer search returned HTTP 200 with four offers.
