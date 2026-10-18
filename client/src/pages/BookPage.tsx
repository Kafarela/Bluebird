import { SiteShell } from "@/components/SiteShell";
import { FlightBookingForm } from "@/components/FlightBookingForm";

export default function BookPage() {
  return (
    <SiteShell>
      <section className="inner-hero">
        <div className="page-wrap">
          <div className="eyebrow light-eyebrow">
            <span className="eyebrow-line" /> BOOK A FLIGHT
          </div>
          <h1>Plan your flight.</h1>
          <p>
            Enter passenger details, choose a route and dates, then check live
            availability.
          </p>
        </div>
      </section>
      <main className="page-wrap section-block book-page-content">
        <FlightBookingForm mode="page" />
      </main>
    </SiteShell>
  );
}
