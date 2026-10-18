import { describe, expect, it } from "vitest";
import {
  buildDuffelOfferRequest,
  buildDuffelOfferRequestUrl,
} from "../shared/duffelSearch";
import type { DuffelSearchOptions } from "../shared/duffelSearch";

const baseInput: DuffelSearchOptions = {
  origin: "lax",
  destination: "jfk",
  departureDate: "2026-11-19",
  passengers: 1,
  passengerTypes: ["adult"],
  cabinClass: "economy",
  maxConnections: 0,
};

describe("Duffel offer request mapping", () => {
  it("sends one outbound slice with the selected destination for a one-way trip", () => {
    const request = buildDuffelOfferRequest(baseInput);

    expect(request.data.slices).toEqual([
      { origin: "LAX", destination: "JFK", departure_date: "2026-11-19" },
    ]);
    expect(request.data.passengers).toEqual([{ type: "adult" }]);
    expect(request.data.max_connections).toBe(0);
  });

  it("sends a reverse-destination slice for the selected return date", () => {
    const request = buildDuffelOfferRequest({
      ...baseInput,
      returnDate: "2026-11-26",
    });

    expect(request.data.slices).toEqual([
      { origin: "LAX", destination: "JFK", departure_date: "2026-11-19" },
      { origin: "JFK", destination: "LAX", departure_date: "2026-11-26" },
    ]);
  });

  it("maps a child to Duffel's child type and keeps supplier_timeout in the query string", () => {
    const request = buildDuffelOfferRequest({
      ...baseInput,
      passengers: 2,
      passengerTypes: ["adult", "kid"],
    });

    expect(request.data.passengers).toEqual([
      { type: "adult" },
      { type: "child" },
    ]);
    const url = new URL(buildDuffelOfferRequestUrl());
    expect(url.searchParams.get("return_offers")).toBe("true");
    expect(url.searchParams.get("view")).toBe("offers");
    expect(url.searchParams.get("supplier_timeout")).toBe("10000");
  });
});
