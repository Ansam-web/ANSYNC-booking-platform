# ANSYNC — Multi-Tenant Booking Platform

ANSYNC is a multi-tenant SaaS booking platform built as part of the **Parallax Labs Full-Stack Developer Internship (Cohort 4)**.

The platform is designed to help organizations manage their own workspaces, users, services, and bookings while keeping tenant data separated.

## Tech Stack

- **Frontend:** Next.js 16, React, TypeScript, Tailwind CSS
- **Backend:** Next.js App Router API Routes
- **Database:** PostgreSQL 16
- **ORM:** Prisma ORM 8
- **Validation:** Zod
- **Authentication:** bcryptjs for password hashing and JOSE for signed session tokens
- **Infrastructure:** Docker Compose
- **Version Control:** Git and GitHub

## Week 1 — Project Architecture & Multi-Tenant Schema

### Implemented

- Next.js project setup with TypeScript and Tailwind CSS
- Dockerized PostgreSQL database
- Multi-tenant relational database schema
- Database schema snapshots and migration files
- Responsive registration, login, and organization onboarding interfaces
- Registration API with password hashing
- Signed authentication session cookies
- Organization creation with an OWNER membership
- API endpoint for retrieving the authenticated user's workspaces

### Remaining Verification

- Environment variable validation using Zod
- Tenant isolation enforcement using PostgreSQL RLS or application-level RBAC
- Database seed data and reproducible setup
- Login and password-reset functionality
- Final verification of Week 1 deliverables

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── register/
│   │   ├── my-workspaces/
│   │   └── tenants/
│   ├── login/
│   ├── register/
│   └── onboarding/
├── lib/
│   └── auth.ts
└── prisma/
    ├── contract.prisma
    └── db.ts

migrations/
docker-compose.yml
prisma.config.ts
.env.example
```

## Database Design

ANSYNC uses five core models:

| Model | Purpose |
|---|---|
| Tenant | Represents an organization or workspace |
| User | Stores registered user accounts |
| Membership | Connects users to tenants and assigns roles |
| Service | Represents a service belonging to a tenant |
| Booking | Stores bookings linked to a tenant, user, and service |

### Entity Relationship Diagram

```mermaid
erDiagram
    TENANT ||--o{ MEMBERSHIP : has
    USER ||--o{ MEMBERSHIP : joins
    TENANT ||--o{ SERVICE : owns
    TENANT ||--o{ BOOKING : contains
    USER ||--o{ BOOKING : makes
    SERVICE ||--o{ BOOKING : receives

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

### Multi-Tenant Architecture

Each organization is represented by a `Tenant`.

Users can belong to multiple organizations through the `Membership` model.

Services and bookings contain a `tenantId`, allowing the application to associate records with their respective organizations.

The booking schema also includes a composite relationship between `serviceId` and `tenantId`, helping ensure that a booking references a service belonging to the same tenant.

Application-level authorization and tenant isolation enforcement require final verification.

## Local Development Setup

### Prerequisites

- Node.js and npm
- Docker Desktop
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Ansam-web/ANSYNC-booking-platform.git
cd ANSYNC-booking-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL="postgresql://ansync:YOUR_PASSWORD@localhost:5432/ansync_db"
SESSION_SECRET="REPLACE_WITH_A_SECURE_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS"
```

Use the PostgreSQL credentials configured in `docker-compose.yml`.

Never commit actual credentials or session secrets.

### 4. Start PostgreSQL

```bash
docker compose up -d
```

### 5. Initialize the database

The project uses the Prisma ORM 8 contract-based workflow.

After configuring the database connection, initialize the database schema:

```bash
npx prisma contract emit
npx prisma db init
```

Database migration and seed procedures will be finalized as part of the Week 1 verification.

### 6. Start the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Application Pages

- `/register` — Create an account
- `/login` — Login interface
- `/onboarding` — Create an organization workspace

### API Endpoints

- `POST /api/auth/register` — Register a new user
- `POST /api/tenants` — Create a workspace
- `GET /api/my-workspaces` — Retrieve workspaces associated with the current user

## Security Considerations

- Passwords are hashed before database storage.
- Session tokens are signed.
- Authentication cookies use the `HttpOnly` attribute.
- Workspace creation requires an authenticated user.
- Tenant ownership is represented through membership roles.
- Tenant isolation enforcement remains subject to final verification.

## Development Roadmap

This repository will be updated throughout the six-week Parallax Labs internship.

Each week's deliverables will be developed and documented in the same repository.

## Author

**Ansam — Full-Stack Developer Intern**

Parallax Labs, Cohort 4.