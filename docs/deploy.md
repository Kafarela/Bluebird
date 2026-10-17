# Bluebird Airways deployment

Bluebird is packaged as a Docker web service for Railway. The application uses PostgreSQL through Drizzle, and Supabase is the recommended database provider for this repository.

## Supabase

The project schema is in `drizzle-pg/0000_kind_microbe.sql`. Apply it once to the Supabase project before the first production login. The Bluebird tables are `users`, `owner_claims`, and `flight_bookings`.

Set `DATABASE_URL` to the Supabase Postgres connection string. For hosted services, use the Supabase transaction pooler connection string with `sslmode=require` when the provider recommends pooled connections. Keep this value server-side; never put it in client code.

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
