import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";

export type FlightPlace = { label: string; code: string };
type PlaceChoice = {
  type: "airport" | "city";
  name: string;
  cityName: string | null;
  iataCode: string;
  iataCityCode: string | null;
  countryCode: string;
};

export function PlacePicker({
  label,
  value,
  onChange,
  isInvalid = false,
}: {
  label: "From" | "To";
  value: FlightPlace;
  onChange: (place: FlightPlace) => void;
  isInvalid?: boolean;
}) {
  const [debouncedLabel, setDebouncedLabel] = useState(value.label);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedLabel(value.label), 250);
    return () => window.clearTimeout(timer);
  }, [value.label]);
  const query = trpc.duffel.placeSuggestions.useQuery(
    { query: debouncedLabel.trim() },
    {
      enabled: !value.code && debouncedLabel.trim().length >= 2,
      retry: false,
      staleTime: 300000,
    }
  );
  const isCurrentQuery = debouncedLabel.trim() === value.label.trim();
  const suggestions = isCurrentQuery
    ? ((query.data || []) as PlaceChoice[])
    : [];
  const suggestionError = query.error?.message
    .toLowerCase()
    .includes("not configured")
    ? "Live airport lookup is not configured on this server. Enter a known three-letter IATA code or contact Bluebird."
    : "City and airport suggestions are unavailable. Try again, or enter a known three-letter IATA code.";
  const suggestionId = `place-suggestions-${label.toLowerCase()}`;
  const choose = (place: PlaceChoice) => {
    const code = place.iataCode.toUpperCase();
    const placeName = place.cityName || place.name;
    onChange({ label: `${placeName} · ${code}`, code });
  };

  return (
    <div className="field place-picker">
      <label htmlFor={`place-${label.toLowerCase()}`}>
        <span>{label}</span>
      </label>
      <input
        id={`place-${label.toLowerCase()}`}
        value={value.label}
        onChange={event => onChange({ label: event.target.value, code: "" })}
        placeholder="City or airport"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={!value.code && suggestions.length > 0}
        aria-controls={suggestionId}
        aria-invalid={isInvalid || undefined}
      />
      {!value.code && isCurrentQuery && query.isFetching && (
        <small className="place-picker-loading" role="status">
          <span className="bluebird-spinner" aria-hidden="true" />
          Finding cities and airports…
        </small>
      )}
      {!value.code && isCurrentQuery && query.isError && (
        <small className="place-picker-error" role="alert">
          {suggestionError}
        </small>
      )}
      {isInvalid && (
        <small className="place-picker-error" role="alert">
          Select a listed city or airport, or enter a three-letter IATA code.
        </small>
      )}
      {!value.code &&
        isCurrentQuery &&
        !query.isFetching &&
        query.isSuccess &&
        suggestions.length === 0 && (
          <small className="place-picker-hint">
            No matches found. You can enter a three-letter IATA airport code
            directly.
          </small>
        )}
      {!value.code && suggestions.length > 0 && (
        <div
          className="place-suggestions"
          role="listbox"
          id={suggestionId}
          aria-label={`${label} city and airport suggestions`}
        >
          {suggestions.slice(0, 8).map(place => (
            <button
              type="button"
              role="option"
              aria-selected={false}
              key={`${place.type}-${place.iataCode}-${place.countryCode}`}
              onClick={() => choose(place)}
            >
              <MapPin size={14} />
              <span>
                <strong>{place.cityName || place.name}</strong>
                <small>
                  {place.type === "city" ? "City" : place.name} ·{" "}
                  {place.countryCode}
                </small>
              </span>
              <b>{place.iataCode}</b>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
