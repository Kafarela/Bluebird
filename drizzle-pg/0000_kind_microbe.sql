CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."traveler_type" AS ENUM('adult', 'kid', 'teenager');--> statement-breakpoint
CREATE TYPE "public"."layover_hub" AS ENUM('non_stop', 'single_layover', 'multi_stop');--> statement-breakpoint
CREATE TYPE "public"."ticket_type" AS ENUM('one_way', 'round_trip');--> statement-breakpoint
CREATE TYPE "public"."flight_class" AS ENUM('economy', 'business', 'first');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('confirmed', 'pending', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('paid', 'partially_paid', 'unpaid');--> statement-breakpoint
CREATE TABLE "flight_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookingReference" varchar(20) NOT NULL,
	"travelerName" varchar(180) NOT NULL,
	"travelerEmail" varchar(320),
	"travelerPhone" varchar(60),
	"travelerType" "traveler_type",
	"travelerCount" integer,
	"seatNumber" varchar(20),
	"layoverHub" "layover_hub",
	"airlineName" varchar(160),
	"airlineLogoUrl" text,
	"flightNumber" varchar(20),
	"ticketType" "ticket_type",
	"flightClass" "flight_class",
	"departureCity" varchar(120) NOT NULL,
	"departureState" varchar(120),
	"departureCountry" varchar(120) NOT NULL,
	"departureAirport" varchar(160),
	"departureTerminal" varchar(120),
	"arrivalCity" varchar(120) NOT NULL,
	"arrivalState" varchar(120),
	"arrivalCountry" varchar(120) NOT NULL,
	"arrivalAirport" varchar(160),
	"arrivalTerminal" varchar(120),
	"departureAt" timestamp NOT NULL,
	"arrivalAt" timestamp NOT NULL,
	"totalTravelTime" varchar(80),
	"totalMiles" integer,
	"ticketStatus" "ticket_status",
	"eTicketNumber" varchar(40),
	"bookingAt" timestamp,
	"amountDue" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"amountPaid" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"paymentStatus" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"notes" text,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "flight_bookings_bookingReference_unique" UNIQUE("bookingReference")
);
--> statement-breakpoint
CREATE TABLE "owner_claims" (
	"id" integer PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"claimedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "owner_claims_ownerUserId_unique" UNIQUE("ownerUserId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
