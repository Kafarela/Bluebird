export type DuffelPassengerType = "adult" | "youth" | "kid" | "teenager";

export type DuffelSearchOptions = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  passengerTypes?: DuffelPassengerType[];
  cabinClass: "economy" | "premium_economy" | "business" | "first";
  maxConnections: number;
};

export function buildDuffelOfferRequest(input: DuffelSearchOptions) {
  const origin = input.origin.trim().toUpperCase();
  const destination = input.destination.trim().toUpperCase();
  const passengerTypes =
    input.passengerTypes?.length === input.passengers
      ? input.passengerTypes
      : Array.from({ length: input.passengers }, () => "adult" as const);

  return {
    data: {
      slices: [
        {
          origin,
          destination,
          departure_date: input.departureDate,
        },
        ...(input.returnDate
          ? [
              {
                origin: destination,
                destination: origin,
                departure_date: input.returnDate,
              },
            ]
          : []),
      ],
      passengers: passengerTypes.map(type => ({
        type: type === "kid" ? "child" : "adult",
      })),
      cabin_class: input.cabinClass,
      max_connections: input.maxConnections,
    },
  };
}

export function buildDuffelOfferRequestUrl() {
  const params = new URLSearchParams({
    return_offers: "true",
    view: "offers",
    supplier_timeout: "10000",
  });
  return `https://api.duffel.com/air/offer_requests?${params.toString()}`;
}
