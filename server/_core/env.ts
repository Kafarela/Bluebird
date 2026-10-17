import { createHash } from "node:crypto";

// Platform values are read at use time. See the Webdev service/authentication skills.
export const ENV = {
  get appId() { return process.env.AUTH_APP_ID ?? process.env.MANUS_PROJECT_ID ?? "bluebird-railway"; },
  get cookieSecret() {
    const configured = process.env.AUTH_SESSION_SECRET ?? process.env.MANUS_JWT_SECRET;
    if (configured) return configured;
    const databaseUrl = process.env.DATABASE_URL ?? "";
    return databaseUrl ? createHash("sha256").update(`bluebird-session:${databaseUrl}`).digest("hex") : "";
  },
  get databaseUrl() { return process.env.DATABASE_URL ?? ""; },
  get oAuthServerUrl() { return process.env.MANUS_OAUTH_API_URL ?? ""; },
  // Preserve the legacy hint when supplied; otherwise roles remain application data.
  get ownerOpenId() { return process.env.OWNER_OPEN_ID ?? ""; },
  get isProduction() { return process.env.NODE_ENV === "production"; },
  get forgeApiUrl() { return process.env.MANUS_API_URL ?? ""; },
  get forgeApiKey() { return process.env.MANUS_API_KEY ?? ""; },
};
