-- ANSYNC - Week 1 Seed Data
-- Add a sample tenant and service for testing.

INSERT INTO "Tenant" ("name", "slug")
VALUES ('Demo Studio', 'demo-studio')
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Service" ("tenantId", "name", "description", "duration", "price")
SELECT
    "id",
    'Consultation',
    'A 30-minute consultation session',
    30,
    50
FROM "Tenant"
WHERE "slug" = 'demo-studio'
AND NOT EXISTS (
    SELECT 1
    FROM "Service"
    WHERE "name" = 'Consultation'
    AND "tenantId" = "Tenant"."id"
);