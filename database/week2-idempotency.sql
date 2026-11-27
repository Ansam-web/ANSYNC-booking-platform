-- Week 2: Booking API Idempotency

BEGIN;

CREATE TABLE IF NOT EXISTS "BookingIdempotency" (
    "tenantId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseBody" JSONB,
    "responseStatus" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY ("tenantId", "userId", "key"),

    FOREIGN KEY ("tenantId")
        REFERENCES "Tenant"("id") ON DELETE CASCADE,

    FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE
);

ALTER TABLE "BookingIdempotency"
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_idempotency_isolation
ON "BookingIdempotency";

CREATE POLICY booking_idempotency_isolation
ON "BookingIdempotency"
FOR ALL
TO ansync_app
USING (
    "tenantId" = NULLIF(
        current_setting('app.current_tenant_id', true), ''
    )::integer
)
WITH CHECK (
    "tenantId" = NULLIF(
        current_setting('app.current_tenant_id', true), ''
    )::integer
);

GRANT SELECT, INSERT, UPDATE
ON "BookingIdempotency"
TO ansync_app;

COMMIT;