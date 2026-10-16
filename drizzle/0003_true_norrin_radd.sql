ALTER TABLE `flight_bookings` ADD `travelerType` enum('adult','kid','teenager');--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `travelerCount` int;--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `seatNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `airlineName` varchar(160);--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `flightNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `ticketType` enum('one_way','round_trip');--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `flightClass` enum('economy','business','first');--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `departureAirport` varchar(160);--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `departureTerminal` varchar(120);--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `arrivalAirport` varchar(160);--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `arrivalTerminal` varchar(120);--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `totalTravelTime` varchar(80);--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `totalMiles` int;--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `ticketStatus` enum('confirmed','pending','cancelled');--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `eTicketNumber` varchar(40);--> statement-breakpoint
ALTER TABLE `flight_bookings` ADD `bookingAt` datetime;