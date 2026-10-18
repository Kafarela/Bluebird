import { z } from "zod";

export const requestPassengerSchema = z.object({
  fullName: z.string().trim().min(2).max(180),
  gender: z.enum(["M", "F"]),
  type: z.enum(["adult", "youth", "kid", "teenager"]),
});

const segmentSchema = z.object({
  origin: z.string().trim().min(3).max(8),
  destination: z.string().trim().min(3).max(8),
  departureAt: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine(value => Number.isFinite(Date.parse(value))),
  arrivalAt: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine(value => Number.isFinite(Date.parse(value))),
  operatingCarrier: z.string().trim().min(1).max(160),
  flightNumber: z.string().trim().min(1).max(20),
});

export const bookingRequestInputSchema = z
  .object({
    contactName: z.string().trim().min(2).max(180),
    contactEmail: z.string().trim().email().max(320),
    contactPhone: z.string().trim().min(5).max(60),
    passengers: z.array(requestPassengerSchema).min(1).max(9),
    route: z.object({
      origin: z
        .string()
        .trim()
        .regex(/^[A-Za-z]{3}$/, "Use a three-letter IATA airport code")
        .transform(value => value.toUpperCase()),
      originLabel: z.string().trim().max(180).optional(),
      destination: z
        .string()
        .trim()
        .regex(/^[A-Za-z]{3}$/, "Use a three-letter IATA airport code")
        .transform(value => value.toUpperCase()),
      destinationLabel: z.string().trim().max(180).optional(),
      departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      returnDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
      passengerCount: z.number().int().min(1).max(9),
      cabinClass: z.enum(["economy", "premium_economy", "business", "first"]),
      passengerCategory: z
        .enum(["adult", "youth", "teenager", "adult_kids"])
        .optional(),
      maxConnections: z
        .union([z.literal(0), z.literal(1), z.literal(3)])
        .optional(),
    }),
    selectedOffer: z.object({
      id: z
        .string()
        .trim()
        .regex(/^off_[A-Za-z0-9]+$/),
      offerRequestId: z.string().trim().max(128).nullable(),
      airlineName: z.string().trim().min(1).max(160),
      totalAmount: z.string().regex(/^\d{1,12}(?:\.\d{1,4})?$/),
      totalCurrency: z.string().regex(/^[A-Z]{3}$/),
      expiresAt: z
        .string()
        .trim()
        .max(80)
        .refine(value => Number.isFinite(Date.parse(value)))
        .nullable(),
      slices: z
        .array(
          z.object({
            duration: z.string().trim().max(80).nullable(),
            segments: z.array(segmentSchema).min(1).max(4),
          })
        )
        .min(1)
        .max(2),
    }),
  })
  .superRefine((value, ctx) => {
    const isCalendarDate = (dateValue: string) => {
      const date = new Date(`${dateValue}T00:00:00.000Z`);
      return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === dateValue
      );
    };
    const earliestUtcDate = new Date();
    // A traveler west of UTC can still be on the prior local calendar date.
    earliestUtcDate.setUTCDate(earliestUtcDate.getUTCDate() - 1);
    const earliestAcceptedDeparture = earliestUtcDate
      .toISOString()
      .slice(0, 10);
    if (!isCalendarDate(value.route.departureDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["route", "departureDate"],
        message: "Enter a valid departure date.",
      });
    } else if (value.route.departureDate < earliestAcceptedDeparture) {
      ctx.addIssue({
        code: "custom",
        path: ["route", "departureDate"],
        message: "Departure date must be today or later.",
      });
    }
    if (value.route.returnDate && !isCalendarDate(value.route.returnDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["route", "returnDate"],
        message: "Enter a valid return date.",
      });
    }
    if (value.route.passengerCount !== value.passengers.length) {
      ctx.addIssue({
        code: "custom",
        path: ["passengers"],
        message: "Passenger details must match the selected passenger count.",
      });
    }
    const passengerCategory = value.route.passengerCategory;
    if (passengerCategory === "adult_kids") {
      if (
        value.passengers.length < 2 ||
        value.passengers[0]?.type !== "adult" ||
        value.passengers.slice(1).some(passenger => passenger.type !== "kid")
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["passengers"],
          message:
            "Adult&Kids requires one adult followed by at least one child.",
        });
      }
    } else if (
      passengerCategory &&
      value.passengers.some(passenger => passenger.type !== passengerCategory)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["passengers"],
        message:
          "Passenger details do not match the selected passenger category.",
      });
    }
    if (value.route.origin === value.route.destination) {
      ctx.addIssue({
        code: "custom",
        path: ["route", "destination"],
        message: "Choose a different destination airport.",
      });
    }
    if (
      value.route.returnDate &&
      value.route.returnDate <= value.route.departureDate
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["route", "returnDate"],
        message: "Return date must be after the departure date.",
      });
    }
    if (Number(value.selectedOffer.totalAmount) <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedOffer", "totalAmount"],
        message: "The offer price must be greater than zero.",
      });
    }
    const expectedSlices = value.route.returnDate ? 2 : 1;
    if (value.selectedOffer.slices.length !== expectedSlices) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedOffer", "slices"],
        message: "The selected offer does not match the trip type.",
      });
    }
    const outbound = value.selectedOffer.slices[0];
    const outboundFirst = outbound?.segments[0];
    const outboundLast = outbound?.segments[outbound.segments.length - 1];
    if (
      outboundFirst &&
      outboundFirst.origin.toUpperCase() !== value.route.origin
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedOffer", "slices", 0],
        message: "The offer does not depart from the selected origin.",
      });
    }
    if (
      outboundFirst &&
      outboundFirst.departureAt.slice(0, 10) !== value.route.departureDate
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedOffer", "slices", 0],
        message: "The offer does not match the selected departure date.",
      });
    }
    if (
      outboundLast &&
      outboundLast.destination.toUpperCase() !== value.route.destination
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedOffer", "slices", 0],
        message: "The offer does not arrive at the selected destination.",
      });
    }
    const returnSlice = value.selectedOffer.slices[1];
    if (
      returnSlice?.segments[0] &&
      value.route.returnDate &&
      returnSlice.segments[0].departureAt.slice(0, 10) !==
        value.route.returnDate
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedOffer", "slices", 1],
        message: "The offer does not match the selected return date.",
      });
    }
    value.selectedOffer.slices.forEach((slice, sliceIndex) => {
      slice.segments.forEach((segment, segmentIndex) => {
        if (Date.parse(segment.arrivalAt) <= Date.parse(segment.departureAt)) {
          ctx.addIssue({
            code: "custom",
            path: [
              "selectedOffer",
              "slices",
              sliceIndex,
              "segments",
              segmentIndex,
            ],
            message: "A flight segment has invalid timing.",
          });
        }
        const nextSegment = slice.segments[segmentIndex + 1];
        if (
          nextSegment &&
          Date.parse(nextSegment.departureAt) < Date.parse(segment.arrivalAt)
        ) {
          ctx.addIssue({
            code: "custom",
            path: [
              "selectedOffer",
              "slices",
              sliceIndex,
              "segments",
              segmentIndex + 1,
            ],
            message: "Flight segments must be in chronological order.",
          });
        }
      });
    });
  });

export type BookingRequestInput = z.infer<typeof bookingRequestInputSchema>;
export type RequestPassenger = z.infer<typeof requestPassengerSchema>;
export type RequestRoute = BookingRequestInput["route"];
export type RequestOffer = BookingRequestInput["selectedOffer"];
