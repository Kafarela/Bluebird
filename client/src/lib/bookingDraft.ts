import { z } from "zod";
import {
  bookingRequestInputSchema,
  type RequestOffer,
  type RequestPassenger,
  type RequestRoute,
} from "@shared/bookingRequest";

export type BookingDraftPassenger = Omit<RequestPassenger, "gender"> & {
  gender: "" | "M" | "F";
};

export type BookingDraft = {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  passengers?: BookingDraftPassenger[];
  route?: RequestRoute;
  selectedOffer?: RequestOffer | null;
};

const DRAFT_KEY = "bluebird.booking-request.v1";
const bookingDraftSchema = z.object({
  contactName: z.string().max(180).optional(),
  contactEmail: z.string().max(320).optional(),
  contactPhone: z.string().max(60).optional(),
  passengers: z
    .array(
      z.object({
        fullName: z.string().max(180),
        gender: z.enum(["", "M", "F"]),
        type: z.enum(["adult", "kid", "teenager"]),
      })
    )
    .max(9)
    .optional(),
  route: bookingRequestInputSchema.shape.route.optional(),
  selectedOffer: bookingRequestInputSchema.shape.selectedOffer
    .nullable()
    .optional(),
});

export function readBookingDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = bookingDraftSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data as BookingDraft;
    clearBookingDraft();
    return null;
  } catch {
    clearBookingDraft();
    return null;
  }
}

export function writeBookingDraft(draft: BookingDraft): boolean {
  if (typeof window === "undefined") return false;
  try {
    const parsed = bookingDraftSchema.safeParse(draft);
    if (!parsed.success) return false;
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(parsed.data));
    return true;
  } catch {
    return false;
  }
}

export function clearBookingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Cleanup is best-effort; a saved request must still show its receipt.
  }
}
