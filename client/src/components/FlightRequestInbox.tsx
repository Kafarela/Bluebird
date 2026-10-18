import { useState } from "react";
import {
  CheckCircle2,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Ticket,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type {
  RequestOffer,
  RequestPassenger,
  RequestRoute,
} from "@shared/bookingRequest";

type RequestRow = {
  id: number;
  requestReference: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  passengers: RequestPassenger[];
  route: RequestRoute;
  selectedOffer: RequestOffer;
  status: "new" | "contacted" | "closed";
  ownerNotes: string | null;
  createdAt: Date | string;
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}

function RequestCard({
  request,
  onSave,
  saving,
}: {
  request: RequestRow;
  onSave: (values: {
    id: number;
    status: RequestRow["status"];
    ownerNotes: string;
  }) => void;
  saving: boolean;
}) {
  const [status, setStatus] = useState<RequestRow["status"]>(request.status);
  const [ownerNotes, setOwnerNotes] = useState(request.ownerNotes || "");
  return (
    <article className="flight-request-card">
      <div className="flight-request-top">
        <div>
          <p className="card-kicker">
            {request.requestReference} · {dateLabel(String(request.createdAt))}
          </p>
          <h3>
            {request.route.origin} <span>→</span> {request.route.destination}
          </h3>
          <p>
            {request.route.departureDate}
            {request.route.returnDate
              ? ` · Return ${request.route.returnDate}`
              : " · One way"}{" "}
            · {request.route.passengerCount} traveler
            {request.route.passengerCount === 1 ? "" : "s"}
          </p>
        </div>
        <span className={`request-status-pill request-status-${status}`}>
          {status === "new"
            ? "New"
            : status === "contacted"
              ? "Contacted"
              : "Closed"}
        </span>
      </div>
      <div className="flight-request-summary">
        <div>
          <span>Selected airline</span>
          <strong>{request.selectedOffer.airlineName}</strong>
        </div>
        <div>
          <span>Fare snapshot</span>
          <strong>
            {request.selectedOffer.totalCurrency}{" "}
            {Number(request.selectedOffer.totalAmount).toLocaleString(
              undefined,
              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
            )}
          </strong>
        </div>
        <div>
          <span>Cabin</span>
          <strong>{request.route.cabinClass.replaceAll("_", " ")}</strong>
        </div>
      </div>
      <div className="flight-request-contact">
        <div>
          <Mail size={15} />
          <a href={`mailto:${encodeURIComponent(request.contactEmail)}`}>
            {request.contactName} · {request.contactEmail}
          </a>
        </div>
        <div>
          <Phone size={15} />
          <a href={`tel:${encodeURIComponent(request.contactPhone)}`}>
            {request.contactPhone}
          </a>
        </div>
      </div>
      <div className="flight-request-travelers">
        <p className="card-kicker">TRAVELERS</p>
        {request.passengers.map((passenger, index) => (
          <span key={`${passenger.fullName}-${index}`}>
            {passenger.fullName} · {passenger.gender} · {passenger.type}
          </span>
        ))}
      </div>
      <details className="flight-request-segments">
        <summary>
          <Ticket size={15} /> Selected flight segments
        </summary>
        {request.selectedOffer.slices.map((slice, sliceIndex) => (
          <div key={sliceIndex}>
            <strong>
              {sliceIndex === 0 ? "Outbound" : "Return"}
              {slice.duration ? ` · ${slice.duration}` : ""}
            </strong>
            {slice.segments.map((segment, index) => (
              <p key={`${segment.flightNumber}-${index}`}>
                {segment.origin} → {segment.destination} ·{" "}
                {segment.operatingCarrier} {segment.flightNumber} ·{" "}
                {dateLabel(segment.departureAt)}
              </p>
            ))}
          </div>
        ))}
      </details>
      <div className="flight-request-manage">
        <label className="field">
          <span>Request status</span>
          <select
            value={status}
            onChange={event =>
              setStatus(event.target.value as RequestRow["status"])
            }
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label className="field">
          <span>Internal note</span>
          <textarea
            value={ownerNotes}
            onChange={event => setOwnerNotes(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Add an owner-only note…"
          />
        </label>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onSave({ id: request.id, status, ownerNotes })}
          disabled={saving}
        >
          <Save size={15} /> {saving ? "Saving…" : "Save review"}
        </button>
      </div>
    </article>
  );
}

export function FlightRequestInbox() {
  const utils = trpc.useUtils();
  const requests = trpc.bookingRequest.adminList.useQuery(undefined, {
    retry: false,
  });
  const update = trpc.bookingRequest.adminUpdate.useMutation({
    onSuccess: () => {
      void utils.bookingRequest.adminList.invalidate();
    },
  });
  const save = (values: {
    id: number;
    status: "new" | "contacted" | "closed";
    ownerNotes: string;
  }) => update.mutate(values);
  return (
    <section className="flight-request-inbox">
      <div className="flight-request-inbox-heading">
        <div>
          <p className="card-kicker">TRAVELER PIPELINE</p>
          <h2>
            <Ticket size={20} /> Flight booking requests
          </h2>
          <p>
            Requests are not reservations. Reconfirm fare and availability
            before creating any ticket.
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => void requests.refetch()}
          aria-label="Refresh booking requests"
        >
          <RefreshCw size={17} />
        </button>
      </div>
      {requests.isLoading ? (
        <div className="empty-state">Loading booking requests…</div>
      ) : requests.isError ? (
        <div className="error-banner">{requests.error.message}</div>
      ) : requests.data?.length ? (
        <div className="flight-request-list">
          {(requests.data as RequestRow[]).map(request => (
            <RequestCard
              key={request.id}
              request={request}
              onSave={save}
              saving={update.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <CheckCircle2 size={18} />
          </span>
          <h3>No flight requests yet.</h3>
          <p>
            Traveler requests sent from the live flight flow will appear here.
          </p>
        </div>
      )}
    </section>
  );
}
