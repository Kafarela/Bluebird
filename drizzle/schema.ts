import { datetime, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing the Manus OAuth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const flightBookings = mysqlTable("flight_bookings", {
  id: int("id").autoincrement().primaryKey(),
  bookingReference: varchar("bookingReference", { length: 20 }).notNull().unique(),
  travelerName: varchar("travelerName", { length: 180 }).notNull(),
  travelerEmail: varchar("travelerEmail", { length: 320 }),
  travelerPhone: varchar("travelerPhone", { length: 60 }),
  travelerType: mysqlEnum("travelerType", ["adult", "kid", "teenager"]),
  travelerCount: int("travelerCount"),
  seatNumber: varchar("seatNumber", { length: 20 }),
  airlineName: varchar("airlineName", { length: 160 }),
  flightNumber: varchar("flightNumber", { length: 20 }),
  ticketType: mysqlEnum("ticketType", ["one_way", "round_trip"]),
  flightClass: mysqlEnum("flightClass", ["economy", "business", "first"]),
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
  departureAt: datetime("departureAt").notNull(),
  arrivalAt: datetime("arrivalAt").notNull(),
  totalTravelTime: varchar("totalTravelTime", { length: 80 }),
  totalMiles: int("totalMiles"),
  ticketStatus: mysqlEnum("ticketStatus", ["confirmed", "pending", "cancelled"]),
  eTicketNumber: varchar("eTicketNumber", { length: 40 }),
  bookingAt: datetime("bookingAt"),
  amountDue: decimal("amountDue", { precision: 12, scale: 2 }).notNull().default("0.00"),
  amountPaid: decimal("amountPaid", { precision: 12, scale: 2 }).notNull().default("0.00"),
  paymentStatus: mysqlEnum("paymentStatus", ["paid", "partially_paid", "unpaid"]).notNull().default("unpaid"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlightBooking = typeof flightBookings.$inferSelect;
export type InsertFlightBooking = typeof flightBookings.$inferInsert;

export const ownerClaims = mysqlTable("owner_claims", {
  id: int("id").primaryKey(),
  ownerUserId: int("ownerUserId").notNull().unique(),
  claimedAt: timestamp("claimedAt").defaultNow().notNull(),
});
