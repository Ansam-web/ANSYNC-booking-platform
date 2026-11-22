
-- Week 1: Tenant isolation using PostgreSQL RLS

-- Enable row-level security on tenant-owned data
ALTER TABLE "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;

-- Service: only access services from the active tenant
CREATE POLICY service_tenant_isolation
ON "Service"
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

-- Booking: only access bookings from the active tenant
CREATE POLICY booking_tenant_isolation
ON "Booking"
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

-- Membership: only access memberships from the active tenant
CREATE POLICY membership_tenant_isolation
ON "Membership"
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