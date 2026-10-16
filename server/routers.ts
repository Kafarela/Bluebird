import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";

const locationSchema = z.object({
  city: z.string().trim().min(1, "City is required").max(120),
  state: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().min(1, "Country is required").max(120),
});

const bookingInput = z.object({
  bookingReference: z.string().trim().min(3).max(20).regex(/^[a-z0-9-]+$/i, "Use letters, numbers, or hyphens only"),
  travelerName: z.string().trim().min(1).max(180),
  travelerEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
  travelerPhone: z.string().trim().max(60).optional().or(z.literal("")),
  departure: locationSchema,
  arrival: locationSchema,
  departureAt: z.coerce.date(),
  arrivalAt: z.coerce.date(),
  amountDue: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
  amountPaid: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
  paymentStatus: z.enum(["paid", "partially_paid", "unpaid"]),
  notes: z.string().max(2000).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.arrivalAt <= value.departureAt) {
    ctx.addIssue({ code: "custom", path: ["arrivalAt"], message: "Arrival must be after departure" });
  }
  const dueCents = Math.round(Number(value.amountDue) * 100);
  const paidCents = Math.round(Number(value.amountPaid) * 100);
  if (paidCents > dueCents) {
    ctx.addIssue({ code: "custom", path: ["amountPaid"], message: "Paid amount cannot exceed amount due" });
  }
  if (value.paymentStatus === "paid" && paidCents !== dueCents) {
    ctx.addIssue({ code: "custom", path: ["paymentStatus"], message: "Paid status requires the full amount to be paid" });
  }
  if (value.paymentStatus === "unpaid" && paidCents !== 0) {
    ctx.addIssue({ code: "custom", path: ["paymentStatus"], message: "Unpaid status requires an amount paid of 0.00" });
  }
  if (value.paymentStatus === "partially_paid" && (paidCents <= 0 || paidCents >= dueCents)) {
    ctx.addIssue({ code: "custom", path: ["paymentStatus"], message: "Partially paid status requires payment between 0.00 and the full amount" });
  }
});

function toInsertBooking(input: z.infer<typeof bookingInput>, createdBy: number) {
  return {
    bookingReference: input.bookingReference.toUpperCase().trim(),
    travelerName: input.travelerName,
    travelerEmail: input.travelerEmail || null,
    travelerPhone: input.travelerPhone || null,
    departureCity: input.departure.city,
    departureState: input.departure.state || null,
    departureCountry: input.departure.country,
    arrivalCity: input.arrival.city,
    arrivalState: input.arrival.state || null,
    arrivalCountry: input.arrival.country,
    departureAt: input.departureAt,
    arrivalAt: input.arrivalAt,
    amountDue: input.amountDue,
    amountPaid: input.amountPaid,
    paymentStatus: input.paymentStatus,
    notes: input.notes || null,
    createdBy,
  } as const;
}

function toBookingFields(input: z.infer<typeof bookingInput>) {
  const { createdBy: _createdBy, ...fields } = toInsertBooking(input, 0);
  return fields;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  owner: router({
    status: publicProcedure.query(async () => ({ hasOwner: await db.hasAdmin() })),
    claim: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        const user = await db.claimOwner(ctx.user.openId);
        return { success: true as const, user };
      } catch (error) {
        throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Unable to claim owner access" });
      }
    }),
  }),
  booking: router({
    lookup: publicProcedure.input(z.object({ reference: z.string().trim().min(3).max(20) })).query(async ({ input }) => {
      const booking = await db.getBookingByReference(input.reference);
      return db.toPublicBooking(booking);
    }),
    adminList: adminProcedure.query(() => db.listBookings()),
    adminCreate: adminProcedure.input(bookingInput).mutation(async ({ input, ctx }) => {
      try {
        return await db.createBooking({ ...toBookingFields(input), createdBy: ctx.user.id });
      } catch (error) {
        if (String(error).toLowerCase().includes("duplicate")) {
          throw new TRPCError({ code: "CONFLICT", message: "That booking reference is already in use." });
        }
        throw error;
      }
    }),
    adminUpdate: adminProcedure.input(z.object({ id: z.number().int().positive(), data: bookingInput })).mutation(async ({ input }) => {
      try {
        return await db.updateBooking(input.id, toBookingFields(input.data));
      } catch (error) {
        if (String(error).toLowerCase().includes("duplicate")) {
          throw new TRPCError({ code: "CONFLICT", message: "That booking reference is already in use." });
        }
        throw error;
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
