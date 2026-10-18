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
- [x] Each live offer lets the traveler continue to a request-review page showing the selected airline, fare and currency, route segments, dates, passenger count, and passenger/contact information, with the ability to correct contact/passenger details before submission.
- [x] Before submission, the server retrieves the selected offer from Duffel again and stores only the provider-returned fare and itinerary; it rejects expired/unavailable offers, route or passenger-count mismatches, and fare changes so the traveler must reselect. Submitting creates a database-backed request with a high-entropy unique request reference and New status. The traveler receives the reference and refreshed fare and is told explicitly that no inventory is held, price/availability must be reconfirmed, no ticket is issued, and no payment is taken.
- [x] Request submission does not create an airline order, a confirmed ticket, a payment, or a public booking lookup record.

## Owner request inbox
- [x] Only authenticated users with the database-backed owner/admin role can list request contact/passenger PII, view the selected offer snapshot, or change request status and internal notes.
- [x] The owner console displays new requests with reference, route, departure date, fare snapshot, contact details, passenger list, and status; the owner can mark each request New, Contacted, or Closed and save an internal note.
