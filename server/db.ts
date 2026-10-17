import { Pool } from "pg";
import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { flightBookings, flightSchedules, InsertFlightBooking, InsertFlightSchedule, InsertUser, ownerClaims, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _pool = null;
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "passwordHash", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      const normalized = user[field] ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId && ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(input: { email: string; name: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(users).values({
    openId: `email:${input.email}`,
    email: input.email,
    name: input.name,
    passwordHash: input.passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
  }).returning();
  return result[0];
}

export async function hasAdmin() {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
  if (result.length > 0) return true;
  const claim = await db.select({ id: ownerClaims.id }).from(ownerClaims).where(eq(ownerClaims.id, 1)).limit(1);
  return claim.length > 0;
}

export async function claimOwner(openId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const currentUser = await getUserByOpenId(openId);
  if (!currentUser) throw new Error("Your account is not ready yet. Please sign in again.");
  if (currentUser.role === "admin") return currentUser;
  if (ENV.ownerOpenId && ENV.ownerOpenId !== openId) {
    throw new Error("Owner access is reserved for the configured project owner.");
  }
  try {
    await db.insert(ownerClaims).values({ id: 1, ownerUserId: currentUser.id });
  } catch (error) {
    if (String(error).toLowerCase().includes("duplicate") || String(error).toLowerCase().includes("unique")) {
      throw new Error("Owner access has already been claimed.");
    }
    throw error;
  }
  await db.update(users).set({ role: "admin" }).where(and(eq(users.id, currentUser.id), eq(users.role, "user")));
  return getUserByOpenId(openId);
}

export async function listBookings() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(flightBookings).orderBy(desc(flightBookings.departureAt));
}

export async function getBookingByReference(reference: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(flightBookings)
    .where(eq(flightBookings.bookingReference, reference.toUpperCase().trim()))
    .limit(1);
  return result[0] ?? null;
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(flightBookings).where(eq(flightBookings.id, id)).limit(1);
  return result[0] ?? null;
}

export function toPublicBooking(booking: Awaited<ReturnType<typeof getBookingByReference>>) {
  if (!booking) return null;
  return {
    bookingReference: booking.bookingReference,
    travelerName: booking.travelerName,
    travelerEmail: booking.travelerEmail,
    travelerType: booking.travelerType,
    travelerCount: booking.travelerCount,
    seatNumber: booking.seatNumber,
    layoverHub: booking.layoverHub,
    airlineName: booking.airlineName,
    airlineLogoUrl: booking.airlineLogoUrl,
    flightNumber: booking.flightNumber,
    ticketType: booking.ticketType,
    flightClass: booking.flightClass,
    departureCity: booking.departureCity,
    departureState: booking.departureState,
    departureCountry: booking.departureCountry,
    departureAirport: booking.departureAirport,
    departureTerminal: booking.departureTerminal,
    arrivalCity: booking.arrivalCity,
    arrivalState: booking.arrivalState,
    arrivalCountry: booking.arrivalCountry,
    arrivalAirport: booking.arrivalAirport,
    arrivalTerminal: booking.arrivalTerminal,
    departureAt: booking.departureAt,
    arrivalAt: booking.arrivalAt,
    totalTravelTime: booking.totalTravelTime,
    totalMiles: booking.totalMiles,
    ticketStatus: booking.ticketStatus,
    eTicketNumber: booking.eTicketNumber,
    bookingAt: booking.bookingAt,
    amountDue: booking.amountDue,
    amountPaid: booking.amountPaid,
    paymentStatus: booking.paymentStatus,
    notes: booking.notes,
    updatedAt: booking.updatedAt,
  };
}

export async function createBooking(booking: InsertFlightBooking) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(flightBookings).values(booking);
  return getBookingByReference(booking.bookingReference);
}

export async function updateBooking(id: number, booking: Partial<InsertFlightBooking>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(flightBookings).set({ ...booking, updatedAt: new Date() }).where(eq(flightBookings.id, id));
  const result = await db.select().from(flightBookings).where(eq(flightBookings.id, id)).limit(1);
  return result[0] ?? null;
}

export async function countBookings() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(flightBookings);
  return Number(result[0]?.count ?? 0);
}

export async function listFlightSchedules() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(flightSchedules).orderBy(desc(flightSchedules.updatedAt));
}

export async function searchFlightSchedules(from: string, to: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const fromTerm = `%${from.toLowerCase()}%`;
  const toTerm = `%${to.toLowerCase()}%`;
  return db.select().from(flightSchedules).where(and(
    eq(flightSchedules.active, 1),
    sql`lower(${flightSchedules.fromCode} || ' ' || ${flightSchedules.fromName}) like ${fromTerm}`,
    sql`lower(${flightSchedules.toCode} || ' ' || ${flightSchedules.toName}) like ${toTerm}`,
  )).orderBy(flightSchedules.price);
}

export async function createFlightSchedule(schedule: InsertFlightSchedule) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(flightSchedules).values(schedule).returning();
  return result[0];
}

export async function updateFlightSchedule(id: number, schedule: Partial<InsertFlightSchedule>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.update(flightSchedules).set({ ...schedule, updatedAt: new Date() }).where(eq(flightSchedules.id, id)).returning();
  return result[0] ?? null;
}

export async function deleteFlightSchedule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(flightSchedules).where(eq(flightSchedules.id, id));
  return { success: true as const };
}
