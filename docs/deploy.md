# Bluebird Airways deployment

Bluebird is packaged as a Docker web service for Railway. The application uses PostgreSQL through Drizzle, and Supabase is the recommended database provider for this repository.

## Supabase

The current PostgreSQL schema is defined in `drizzle/schema.ts`. Bluebird uses `users`, `owner_claims`, `flight_bookings`, `flight_schedules`, and `flight_requests`. Railway's `railway.toml` runs `pnpm db:sync` in its pre-deploy step; for a separate database environment, set `DATABASE_URL` and run `pnpm db:sync` from the repository to synchronize additive schema changes before serving traffic.

Set `DATABASE_URL` to the Supabase Postgres connection string. For hosted services, use the Supabase transaction pooler connection string with `sslmode=require` when the provider recommends pooled connections. Keep this value server-side; never put it in client code. Flight requests are owner-only review records, not airline orders or ticket records; the server refreshes the chosen offer through Duffel before writing provider-sourced fare and itinerary data. Requests contain submitted contact details, so protect the database credentials. Duffel recommends retrieving the single offer to obtain current information and notes that this does not guarantee availability at booking; Bluebird re-fetches the offer when a traveler submits a request ([official offer API documentation](https://duffel.com/docs/api/v2/offers)).

The existing authentication adapter still uses Manus OAuth. Set the `MANUS_*` variables listed in `.env.example` if retaining that sign-in flow. If the site should be completely independent of Manus, replace the adapter in `server/_core/oauth.ts` and `server/_core/sdk.ts` with the chosen provider's server-side auth flow before removing those variables.

## Railway

Create a service from the GitHub repository. Railway will use `railway.toml` and the root `Dockerfile`. Add the same environment variables. Railway assigns a generated public domain after a domain is generated in the service settings; custom domains require a domain you control and may have separate billing or DNS requirements.

## Local verification

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run build
NODE_ENV=production PORT=3000 pnpm start
curl -fsS http://127.0.0.1:3000/api/health
```

The health endpoint must return JSON containing `{"status":"ok"}`. Public pages can render without database credentials, but booking lookup, owner access, and account synchronization require `DATABASE_URL` and the authentication configuration.
