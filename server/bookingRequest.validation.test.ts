import { describe, expect, it } from "vitest";
import { bookingRequestInputSchema } from "../shared/bookingRequest";

const oneWayRequest = {
  contactName: "Ada Lovelace",
  contactEmail: "ada@example.com",
  contactPhone: "+1 555 0100",
  passengers: [
    { fullName: "Ada Lovelace", gender: "F" as const, type: "adult" as const },
  ],
  route: {
    origin: "JFK",
    destination: "LHR",
    departureDate: "2027-04-10",
    returnDate: null,
    passengerCount: 1,
    cabinClass: "economy" as const,
  },
  selectedOffer: {
    id: "off_example",
    offerRequestId: "orq_example",
    airlineName: "Bluebird Airways",
    totalAmount: "540.00",
    totalCurrency: "USD",
    expiresAt: "2027-03-10T12:00:00Z",
    slices: [
      {
        duration: "PT7H",
        segments: [
          {
            origin: "JFK",
            destination: "LHR",
            departureAt: "2027-04-10T10:00:00Z",
            arrivalAt: "2027-04-10T17:00:00Z",
            operatingCarrier: "Bluebird Airways",
            flightNumber: "BB100",
          },
        ],
      },
    ],
  },
};

describe("booking request validation", () => {
  it("accepts a matching one-way itinerary and normalizes airport codes", () => {
    const parsed = bookingRequestInputSchema.parse({
      ...oneWayRequest,
      route: { ...oneWayRequest.route, origin: "jfk" },
    });
    expect(parsed.route.origin).toBe("JFK");
    expect(parsed.selectedOffer.id).toBe("off_example");
  });

  it("rejects passenger counts that do not match passenger details", () => {
    const result = bookingRequestInputSchema.safeParse({
      ...oneWayRequest,
      route: { ...oneWayRequest.route, passengerCount: 2 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an offer whose endpoints do not match the selected route", () => {
    const result = bookingRequestInputSchema.safeParse({
      ...oneWayRequest,
      selectedOffer: {
        ...oneWayRequest.selectedOffer,
        slices: [
          {
            ...oneWayRequest.selectedOffer.slices[0],
            segments: [
              {
                ...oneWayRequest.selectedOffer.slices[0].segments[0],
                origin: "EWR",
              },
            ],
          },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed provider IDs and impossible flight segment times", () => {
    const malformedId = bookingRequestInputSchema.safeParse({
      ...oneWayRequest,
      selectedOffer: {
        ...oneWayRequest.selectedOffer,
        id: "not-a-duffel-offer",
      },
    });
    const impossibleTimes = bookingRequestInputSchema.safeParse({
      ...oneWayRequest,
      selectedOffer: {
        ...oneWayRequest.selectedOffer,
        slices: [
          {
            ...oneWayRequest.selectedOffer.slices[0],
            segments: [
              {
                ...oneWayRequest.selectedOffer.slices[0].segments[0],
                arrivalAt: "2027-04-10T09:00:00Z",
              },
            ],
          },
        ],
      },
    });
    expect(malformedId.success).toBe(false);
    expect(impossibleTimes.success).toBe(false);
  });
});
