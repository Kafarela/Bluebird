CREATE TABLE IF NOT EXISTS "flight_schedules" (
  "id" serial PRIMARY KEY NOT NULL,
  "airline" varchar(160) NOT NULL,
  "flightNumber" varchar(20) NOT NULL,
  "fromCode" varchar(8) NOT NULL,
  "toCode" varchar(8) NOT NULL,
  "fromName" varchar(160) NOT NULL,
  "toName" varchar(160) NOT NULL,
  "departure" varchar(20) NOT NULL,
  "arrival" varchar(20) NOT NULL,
  "duration" varchar(80) NOT NULL,
  "stops" varchar(80) DEFAULT 'Non-stop' NOT NULL,
  "price" numeric(12, 2),
  "active" integer DEFAULT 1 NOT NULL,
  "createdBy" integer NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
