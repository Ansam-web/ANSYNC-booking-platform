# ANSYNC — Multi-Tenant Booking Platform

ANSYNC is a booking platform I'm building as part of my **6-week Full-Stack Developer Internship at Parallax Labs (Cohort 4)**.

The idea behind ANSYNC is to create one application that different businesses can use to manage their bookings, while keeping each business's data separate.

For example, a photography studio and a beauty salon could both use ANSYNC, but each business would have its own workspace, services, and bookings.

I'm developing the project step by step, starting with the database structure, authentication, and organization setup.

## Tech Stack

These are the main technologies I'm using:

| Technology | Why I'm using it |
|---|---|
| Next.js 16 | To build the frontend and backend in the same project |
| React | To create reusable UI components |
| TypeScript | To make the code easier to maintain and catch type errors |
| Tailwind CSS | To build responsive interfaces |
| PostgreSQL 16 | To store users, organizations, services, and bookings |
| Prisma ORM 8 | To define the database models and work with PostgreSQL |
| Docker Compose | To run PostgreSQL locally |
| Zod | To validate incoming data |
| bcryptjs | To hash user passwords before saving them |
| JOSE | To create and verify signed session tokens |
| FullCalendar | Interactive calendar views |
| Sonner | Toast notifications |
| node-postgres (pg) | Tenant-scoped SQL transactions |
| Postman | API testing and documentation |
| Git & GitHub | To track changes and submit my work |

## What I'm Building

The platform is designed around these features:

- **User accounts:** Users can register and access an account sign-in interface.
- **Organization workspaces:** A user can create a workspace for their business.
- **Multi-tenant structure:** Different organizations use the same application but should only access their own data.
- **Team roles:** Users can belong to organizations with different roles.
- **Services:** Each organization can manage its own services.
- **Bookings:** Organizations will be able to manage bookings connected to their services.

The internship project is organized into weekly milestones, beginning with architecture and tenant-aware data modeling.

## Week 1 — Project Architecture & Multi-Tenant Schema

For the first week, I focused on building the foundation of the application.

### What I've Implemented

- Created the Next.js project using TypeScript and Tailwind CSS.
- Set up PostgreSQL using Docker Compose.
- Designed five database models and their relationships.
- Added the database schema and migration-related files.
- Built responsive registration, login UI, and organization onboarding pages.
- Created a registration API that hashes passwords before storing them.
- Added signed session tokens stored in HTTP-only cookies.
- Connected workspace creation to the database.
- Added an OWNER membership when a user creates a workspace.
- Created an API to retrieve workspaces belonging to the authenticated user.
- Initialized the Git repository and uploaded the project to GitHub.

## Project Structure

This is the current structure of the main project files:

```text
ANSYNC-booking-platform/
├── database/
│   ├── rls.sql
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/login/route.ts
│   │   │   ├── bookings/route.ts
│   │   │   ├── bookings/[bookingId]/route.ts
│   │   │   ├── services/route.ts
│   │   │   ├── auth/register/route.ts
│   │   │   ├── my-workspaces/route.ts
│   │   │   └── tenants/route.ts
│   │   ├── dashboard/page.tsx
│   │   ├── dashboard/bookings/page.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── onboarding/page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── tenant-db.ts
│   │   └── env.ts
│   └── prisma/
│       ├── contract.prisma
│       ├── contract.json
│       ├── contract.d.ts
│       └── db.ts
├── migrations/
├── public/
├── docker-compose.yml
├── prisma.config.ts
├── postcss.config.mjs
├── next.config.ts
├── package.json
├── .env.example
└── README.md
```

I separated the project into a few main parts:

- `src/app` contains the pages and API routes.
- `src/lib` contains shared logic, such as authentication helpers.
- `src/prisma` contains the database contract and connection setup.
- `migrations` contains database schema history files.
- `docker-compose.yml` defines the local PostgreSQL service.
- `database/rls.sql` contains the PostgreSQL Row-Level Security policies.
- `database/seed.sql` contains sample data used for testing.
- `src/lib/env.ts` validates the required environment variables using Zod.

This structure makes it easier for me to find files and keep the frontend, backend, and database code organized.

## Database Design

I chose PostgreSQL because the platform has several related types of data.

The database currently contains five main models.

### 1. Tenant

A tenant represents an organization or business using ANSYNC.

Each tenant has a unique `slug`, which can be used as part of its workspace address.

### 2. User

The User model stores account information, including the user's name, email, and hashed password.

### 3. Membership

Membership connects users to organizations.

I decided to keep Membership separate from User because one user might belong to more than one organization.

For example, someone could be an OWNER in one workspace and a MEMBER in another.

Each membership has a role and connects one user to one tenant.

### 4. Service

Each service belongs to a specific tenant.

Services contain information such as their name, duration, description, and optional price.

### 5. Booking

A booking connects a user to a service and a tenant.

It includes a start time, end time, and booking status.

I also used a composite relationship between `serviceId` and `tenantId` to help prevent bookings from referencing services belonging to another tenant.

## Entity Relationship Diagram (ERD)

This diagram shows how the five models are connected.

```mermaid
erDiagram
    TENANT ||--o{ MEMBERSHIP : has
    USER ||--o{ MEMBERSHIP : belongs_to
    TENANT ||--o{ SERVICE : owns
    TENANT ||--o{ BOOKING : contains
    USER ||--o{ BOOKING : makes
    SERVICE ||--o{ BOOKING : has

    TENANT {
        int id PK
        string name
        string slug UK
        datetime createdAt
    }

    USER {
        int id PK
        string name
        string email UK
        string passwordHash
        datetime createdAt
    }

    MEMBERSHIP {
        int id PK
        int tenantId FK
        int userId FK
        string role
    }

    SERVICE {
        int id PK
        int tenantId FK
        string name
        string description
        int duration
        float price
    }

    BOOKING {
        int id PK
        int tenantId FK
        int userId FK
        int serviceId FK
        datetime startTime
        datetime endTime
        string status
        datetime createdAt
    }
```

## How Multi-Tenancy Works

The main idea is that different businesses share the same application, but their data should stay separated.

For this, I added `tenantId` to the Service and Booking models.

The Membership model connects users to the workspaces they belong to.

When a user creates a workspace, the backend creates a Tenant and a Membership with the OWNER role.

I added PostgreSQL Row-Level Security (RLS) policies for the Membership, Service, and Booking tables.

For queries executed as the `ansync_app` role with the active tenant context set, these policies restrict access to tenant-owned records.

I tested the policies using different tenant IDs and confirmed that records from another tenant were not returned.

The SQL policies are scoped to the `ansync_app` database role and use the `app.current_tenant_id` setting. The workspace API independently filters memberships by the authenticated user ID.

## Authentication

For registration, the backend validates the submitted data and checks whether the email is already registered.

Passwords are hashed using bcryptjs before being stored in PostgreSQL.

After registration, the application creates a signed session token using JOSE and stores it in an HTTP-only cookie.

The session token allows the backend to identify the authenticated user.

The login page provides an interface for entering account credentials and a link for password recovery.

## API Routes

These are the API endpoints implemented so far:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Creates a new user account |
| POST | `/api/tenants` | Creates a new workspace and its OWNER membership |
| GET | `/api/my-workspaces` | Returns workspaces associated with the authenticated user |

The API routes use server-side validation and database queries.

See the Week 2 API reference below for additional endpoints.

## How to Run the Project Locally

### Requirements

Before starting, make sure you have:

- Node.js and npm
- Docker Desktop
- Git

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Ansam-web/ANSYNC-booking-platform.git
cd ANSYNC-booking-platform
```

### Step 2 — Install Dependencies

```bash
npm install
```

### Step 3 — Set Up Environment Variables

Create a `.env` file based on `.env.example`.

The project requires:

```env
DATABASE_URL="postgresql://ansync:YOUR_PASSWORD@localhost:5432/ansync_db"
TENANT_DATABASE_URL="postgresql://ansync_app:YOUR_APP_ROLE_PASSWORD@localhost:5432/ansync_db"
SESSION_SECRET="REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG"
```

The PostgreSQL username, password, and database name must match the values configured in `docker-compose.yml`.

The session secret should be a randomly generated value, not the example shown above.

The real `.env` file is ignored by Git because it contains sensitive information.

### Step 4 — Start PostgreSQL

```bash
docker compose up -d
```

### Step 5 — Set Up the Database

This project uses the Prisma ORM 8 contract-based workflow.

Generate the database contract:

```bash
npx prisma contract emit
```

Initialize the database schema:

```bash
npx prisma db init
```

### Step 6 — Apply RLS Policies and Seed Data

The project includes SQL files for tenant isolation and sample data.

Apply the RLS policies using the database administrator:

```powershell
Get-Content database/rls.sql | docker exec -i ansync-postgres psql -X -v ON_ERROR_STOP=1 -U ansync -d ansync_db
```

Insert the sample data:

```powershell
Get-Content database/seed.sql | docker exec -i ansync-postgres psql -X -v ON_ERROR_STOP=1 -U ansync -d ansync_db
```

These commands are written for PowerShell on Windows.

### Step 7 — Week 2 Database Setup

Ensure the restricted `ansync_app` login role exists with the required table and sequence privileges and a password matching `TENANT_DATABASE_URL`. Apply the Week 2 idempotency SQL script in `database/` using the same PowerShell/psql approach above and its actual repository filename. This creates the `BookingIdempotency` table and its RLS policy.

### Step 8 — Start the Application

```bash
npm run dev
```

Then open:

http://localhost:3000

### Available Pages

| Page | URL |
|---|---|
| Home | `/` |
| Register | `/register` |
| Login | `/login` |
| Organization Setup | `/onboarding` |
| Dashboard | `/dashboard` |
| Bookings | `/dashboard/bookings` |

## Challenges I Faced

During the first week, I ran into a few problems while setting up the project.

**1. Next.js development server**

At one point, I had multiple development servers running, which caused port conflicts and made debugging confusing.

I learned how to identify the running server and manage the terminals more carefully.

**2. Tailwind CSS**

The application pages were loading without their expected styling.

I checked the Tailwind and PostCSS setup and fixed the configuration so the styles were applied correctly.

**3. Prisma ORM 8**

The Prisma version I installed uses a different workflow from many older tutorials.

I had to understand the contract-based setup, generate the contract files, and work with the available database API.

**4. Connecting the frontend to the backend**

I started with the registration and onboarding interfaces, then connected them to API routes and PostgreSQL.

Testing the workspace creation helped me understand how the form, API, database, and authentication session work together.

## Week 1 Progress

During Week 1, I focused on setting up the main structure of ANSYNC.

I created the Next.js project, connected PostgreSQL through Docker, and designed five database models: Tenant, User, Membership, Service, and Booking.

I built the registration, login UI, and onboarding interfaces. I also connected registration and workspace creation to backend API routes.

For security, I added password hashing, signed session tokens, environment variable validation, and PostgreSQL RLS policies.

I tested the PostgreSQL RLS policies with different tenant IDs and added sample data for database testing.

This week helped me understand how the frontend, backend, authentication, and database work together.

## Week 2 — Booking APIs & Calendar UI

During Week 2, I extended the application foundation into a working booking management dashboard.

### Implemented Features

- Login with bcrypt credential verification and HTTP-only session cookies.
- Booking creation, listing, details, rescheduling and deletion.
- Workspace selection and service retrieval.
- FullCalendar month, week and day views, plus a booking list.
- Booking forms with client-side and server-side validation.
- Responsive dashboard with booking totals and status summaries.
- Toast notifications, manual retry and session-expiry handling.

### API Reference

Protected routes use the session cookie obtained through login. Booking endpoints return errors in the format `{ "error": { "code": "...", "message": "..." } }`. Authentication and workspace endpoints may instead return a top-level `message`.

| Method | Endpoint | Purpose | Success |
|---|---|---|---|
| POST | `/api/auth/login` | Authenticate and set session cookie | 200 |
| GET | `/api/my-workspaces` | Retrieve accessible workspaces | 200 |
| GET | `/api/services?tenantId=3` | Retrieve workspace services | 200 |
| GET | `/api/bookings?tenantId=3` | List bookings | 200 |
| POST | `/api/bookings` | Create an idempotent booking | 201 |
| GET | `/api/bookings/{bookingId}?tenantId=3` | Booking details | 200 |
| PATCH | `/api/bookings/{bookingId}?tenantId=3` | Reschedule booking | 200 |
| DELETE | `/api/bookings/{bookingId}?tenantId=3` | Delete booking | 200 |

Example creation request (replace IDs and choose an available future time):

```http
POST /api/bookings
Content-Type: application/json
Idempotency-Key: example-unique-key
```

```json
{"tenantId":3,"serviceId":2,"startTime":"2027-12-01T10:00:00.000Z"}
```

PATCH accepts a JSON body containing `startTime` in ISO 8601 format and preserves the existing booking duration.

### Idempotency and Conflict Prevention

POST requires an `Idempotency-Key` of at most 128 characters. The server normalizes the start time and hashes the request using SHA-256. Successful responses are stored in `BookingIdempotency`, keyed by tenant, user and request key. Repeating the same request returns the original response without creating a duplicate; reusing the key with different data returns 409.

Creation and mutations acquire the same tenant-scoped PostgreSQL advisory transaction lock. The backend checks for overlapping non-cancelled bookings before inserting or rescheduling. Adjacent bookings are allowed. Booking creation and its saved idempotency response are committed together.

### Tenant Isolation and Authorization

The API verifies the session and workspace membership. The `withTenant` helper uses a restricted database connection, sets `app.current_tenant_id` within a transaction, and commits or rolls back before releasing the connection. RLS provides an additional tenant boundary. Only workspace owners or the user who owns a booking can reschedule or delete it, subject to membership checks. Cancelled bookings cannot be rescheduled.

Week 2 adds the supporting `BookingIdempotency` table with composite primary key (`tenantId`, `userId`, `key`), request hash, saved response body/status and creation timestamp. The Week 1 ERD above describes the five core models.

### Error Handling

| Status | Meaning |
|---|---|
| 400 | Invalid input or missing idempotency key |
| 401 | Missing or invalid session |
| 403 | Unauthorized workspace or booking operation |
| 404 | Booking or service not found |
| 409 | Booking or idempotency conflict |
| 500 | Unexpected server error |

The dashboard displays toast notifications and a manual retry action. Missing or expired sessions trigger a redirect to login.

### Postman Testing

Import `ANSYNC.postman_collection.json` into Postman. Start the local database and application, set `baseUrl` to `http://localhost:3000`, enter test credentials locally, and configure `forbiddenTenantId` to an existing workspace the test user cannot access. Use a workspace with at least one service. Run the collection in order with one iteration. Login uses the Postman cookie jar; the unauthorized test must run without the session cookie. Never commit real credentials or session cookies.

| Test | Expected status |
|---|---|
| Login | 200 |
| My workspaces | 200 |
| Services | 200 |
| List bookings | 200 |
| Create booking | 201 |
| Replay same key | 201 |
| Key conflict | 409 |
| Overlap conflict | 409 |
| Booking details | 200 |
| Update booking | 200 |
| Invalid input | 400 |
| Cross-tenant access | 403 |
| Delete test booking | 200 |
| Verify deletion | 404 |
| Unauthorized access | 401 |

All 15 requests passed in my reported local test run. The collection creates and deletes a test booking; its idempotency record remains.

### Challenges and Lessons

I worked through calendar styling and dependency compatibility, mobile layout adjustments, database availability and session handling. Testing the API separately helped distinguish authentication and database errors from frontend rendering issues.

### Final Verification

```bash
npx tsc --noEmit
npm run build
```

Run both checks before submitting changes.

## Next Steps

In the coming weeks, I plan to extend the platform according to the remaining internship milestones.

## Author

**Ansam**

Full-Stack Developer Intern — Parallax Labs, Cohort 4

GitHub: https://github.com/Ansam-web

## Additional Setup and Authentication Notes

- The login API (`POST /api/auth/login`) verifies account credentials and creates an authenticated session using a signed HTTP-only cookie.
- The password recovery page (`/forgot-password`) provides a responsive form with email validation. Password reset functionality is not yet implemented.

### Week 2 Database Setup

After applying the initial database schema and RLS policies, run the Week 2 idempotency SQL script:

```powershell
Get-Content database/week2-idempotency.sql | docker exec -i ansync-postgres psql -X -v ON_ERROR_STOP=1 -U ansync -d ansync_db
```

This script creates the BookingIdempotency table, configures its Row-Level Security policy, and grants the required database permissions.