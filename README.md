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
| Git & GitHub | To track changes and submit my work |

## What I'm Building

The platform is designed around a few main features:

- **User accounts:** Users can register and eventually sign in to their accounts.
- **Organization workspaces:** A user can create a workspace for their business.
- **Multi-tenant structure:** Different organizations use the same application but should only access their own data.
- **Team roles:** Users can belong to organizations with different roles.
- **Services:** Each organization can manage its own services.
- **Bookings:** Organizations will be able to manage bookings connected to their services.

Not all features are finished yet. I'm implementing them throughout the internship.

## Week 1 — Project Architecture & Multi-Tenant Schema

For the first week, I focused on building the foundation of the application.

### What I've Implemented

- Created the Next.js project using TypeScript and Tailwind CSS.
- Set up PostgreSQL using Docker Compose.
- Designed five database models and their relationships.
- Added the database schema and migration-related files.
- Built responsive registration, login, and organization onboarding pages.
- Created a registration API that hashes passwords before storing them.
- Added signed session tokens stored in HTTP-only cookies.
- Connected workspace creation to the database.
- Added an OWNER membership when a user creates a workspace.
- Created an API to retrieve workspaces belonging to the authenticated user.
- Initialized the Git repository and uploaded the project to GitHub.

### Still Being Checked or Completed

- Completing the login and password reset functionality.
- Connecting the RLS policies to tenant-specific application requests.
- Testing the full project setup from a fresh clone.

## Project Structure

This is the current structure of the main project files:

```text
ANSYNC-booking-platform/
│
├── database/
│   ├── rls.sql
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── register/
│   │   │   │       └── route.ts
│   │   │   ├── my-workspaces/
│   │   │   │   └── route.ts
│   │   │   └── tenants/
│   │   │       └── route.ts
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── onboarding/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
├── lib/
│   ├── auth.ts
│   └── env.ts
│   │
│   └── prisma/
│       ├── contract.prisma
│       ├── contract.json
│       ├── contract.d.ts
│       └── db.ts
│
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

These policies use the current tenant ID to control which records can be accessed.

I tested the policies using different tenant IDs and confirmed that records from another tenant were not returned.

The next step is to connect this tenant context securely to the application requests, so users cannot access another organization's data just by changing an ID.

## Authentication

For registration, the backend validates the submitted data and checks whether the email is already registered.

Passwords are hashed using bcryptjs before being stored in PostgreSQL.

After registration, the application creates a signed session token using JOSE and stores it in an HTTP-only cookie.

The session token allows the backend to identify the authenticated user.

The login and password reset flows still need to be completed.

## API Routes

These are the API endpoints implemented so far:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Creates a new user account |
| POST | `/api/tenants` | Creates a new workspace and its OWNER membership |
| GET | `/api/my-workspaces` | Returns workspaces associated with the authenticated user |

The API routes use server-side validation and database queries.

More endpoints will be added as the project develops.

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

### Step 6 — Start the Application

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

I built the registration, login, and onboarding interfaces. I also connected registration and workspace creation to backend API routes.

For security, I added password hashing, signed session tokens, environment variable validation, and PostgreSQL RLS policies.

I tested tenant isolation using different tenant IDs and added sample data to help with database testing.

This week helped me understand how the frontend, backend, authentication, and database work together.

## Next Steps

In the coming weeks, I plan to continue building the booking features, improve the dashboard, and add more functionality based on the internship roadmap.

## Author

**Ansam**

Full-Stack Developer Intern — Parallax Labs, Cohort 4

GitHub: https://github.com/Ansam-web