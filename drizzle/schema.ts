import { integer, numeric, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

const userRole = pgEnum("user_role", ["user", "admin"]);
const travelerType = pgEnum("traveler_type", ["adult", "kid", "teenager"]);
const layoverHub = pgEnum("layover_hub", ["non_stop", "single_layover", "multi_stop"]);
const ticketType = pgEnum("ticket_type", ["one_way", "round_trip"]);
const flightClass = pgEnum("flight_class", ["economy", "business", "first"]);
const ticketStatus = pgEnum("ticket_status", ["confirmed", "pending", "cancelled"]);
const paymentStatus = pgEnum("payment_status", ["paid", "partially_paid", "unpaid"]);

/** Core user table backing the Manus OAuth flow. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const flightBookings = pgTable("flight_bookings", {
  id: serial("id").primaryKey(),
  bookingReference: varchar("bookingReference", { length: 20 }).notNull().unique(),
  travelerName: varchar("travelerName", { length: 180 }).notNull(),
  travelerEmail: varchar("travelerEmail", { length: 320 }),
  travelerPhone: varchar("travelerPhone", { length: 60 }),
  travelerType: travelerType("travelerType"),
  travelerCount: integer("travelerCount"),
  seatNumber: varchar("seatNumber", { length: 20 }),
  layoverHub: layoverHub("layoverHub"),
  airlineName: varchar("airlineName", { length: 160 }),
  airlineLogoUrl: text("airlineLogoUrl"),
  flightNumber: varchar("flightNumber", { length: 20 }),
  ticketType: ticketType("ticketType"),
  flightClass: flightClass("flightClass"),
  departureCity: varchar("departureCity", { length: 120 }).notNull(),
  departureState: varchar("departureState", { length: 120 }),
  departureCountry: varchar("departureCountry", { length: 120 }).notNull(),
  departureAirport: varchar("departureAirport", { length: 160 }),
  departureTerminal: varchar("departureTerminal", { length: 120 }),
  arrivalCity: varchar("arrivalCity", { length: 120 }).notNull(),
  arrivalState: varchar("arrivalState", { length: 120 }),
  arrivalCountry: varchar("arrivalCountry", { length: 120 }).notNull(),
  arrivalAirport: varchar("arrivalAirport", { length: 160 }),
  arrivalTerminal: varchar("arrivalTerminal", { length: 120 }),
  departureAt: timestamp("departureAt").notNull(),
  arrivalAt: timestamp("arrivalAt").notNull(),
  totalTravelTime: varchar("totalTravelTime", { length: 80 }),
  totalMiles: integer("totalMiles"),
  ticketStatus: ticketStatus("ticketStatus"),
  eTicketNumber: varchar("eTicketNumber", { length: 40 }),
  bookingAt: timestamp("bookingAt"),
  amountDue: numeric("amountDue", { precision: 12, scale: 2 }).notNull().default("0.00"),
  amountPaid: numeric("amountPaid", { precision: 12, scale: 2 }).notNull().default("0.00"),
  paymentStatus: paymentStatus("paymentStatus").notNull().default("unpaid"),
  notes: text("notes"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type FlightBooking = typeof flightBookings.$inferSelect;
export type InsertFlightBooking = typeof flightBookings.$inferInsert;

export const ownerClaims = pgTable("owner_claims", {
  id: integer("id").primaryKey(),
  ownerUserId: integer("ownerUserId").notNull().unique(),
  claimedAt: timestamp("claimedAt").defaultNow().notNull(),
});
