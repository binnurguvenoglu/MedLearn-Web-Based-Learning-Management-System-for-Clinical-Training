# Private Clinic Management System - Sprint 2

This repository contains a simple full-stack private clinic management system.

## Tech Stack

- Frontend: React + Vite (`/client`)
- Backend: Node.js + Express (`/server`)
- Database: Supabase PostgreSQL (via `DATABASE_URL`)
- Auth: JWT

## Project Structure

```
.
|-- client
|-- server
`-- README.md
```

## Prerequisites

- Node.js 18+
- npm
- Supabase project with PostgreSQL connection string

## 1) Server Setup

```bash
cd server
cp .env.example .env
npm install
```

Fill `server/.env`:

- `PORT=4000`
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET=your_long_secret`
- `CLIENT_URL=http://localhost:5173`

### Initialize DB Schema

Run SQL in Supabase SQL editor:

- File: `server/schema.sql`

## 2) Client Setup

```bash
cd client
npm install
```

If needed, create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:4000
```

## 3) Run

### Option A: Run both from root (recommended)

```bash
npm run install:all
npm run dev
```

### Option B: Run separately

Terminal 1:

```bash
cd server
npm run dev
```

Terminal 2:

```bash
cd client
npm run dev
```

Open: `http://localhost:5173`

## API Summary

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/patients?search=`
- `POST /api/patients`
- `GET /api/patients/:id`
- `PUT /api/patients/:id`
- `DELETE /api/patients/:id`
- `GET /api/users/doctors`
- `GET /api/appointments?date=YYYY-MM-DD&doctor_id=&status=&search=`
- `POST /api/appointments`
- `PUT /api/appointments/:id`
- `PATCH /api/appointments/:id/status`
- `PATCH /api/appointments/:id/cancel`

## Sprint 2 Features

- Appointment update with doctor/date-time change and conflict prevention
- Appointment cancellation via status (`cancelled`) instead of hard delete
- Appointment status management (`scheduled`, `arrived`, `completed`, `cancelled`, `no_show`)
- Appointment filtering by date, doctor, status and text search
- Dashboard upgrades:
  - today's appointments
  - upcoming appointments
  - quick status counts
- Appointments page upgrades:
  - filters section
  - create form validation
  - edit appointment form
  - cancel button
  - status badge and status update control

## Sprint 2 Migration

If your DB was created in Sprint 1, run:

- `server/migrations/sprint2.sql`

This adds `completed` to appointment status enum and creates status index.

## Optional Sample Seed

Optional sample appointment seed:

- `server/seed.sql`

## Manual Test Instructions

1. Register a doctor and receptionist users via `POST /api/auth/register`.
2. Login with valid user (`/api/auth/login`) and copy JWT token.
3. Try protected endpoints without token (should fail with 401).
4. Try protected endpoints with token (should pass).
5. Patient CRUD:
   - Create patient
   - Search patient by name/tc/phone
   - Update patient
   - Delete patient
6. Appointment:
   - Create appointment for a doctor and time
   - Create another with same `doctor_id` + same `start_time` -> should return 400 conflict message
   - Update appointment date/time/doctor and verify conflict rule still works
   - Cancel appointment and verify status becomes `cancelled`
   - Update appointment status to `arrived/completed/no_show` and verify in list
   - Filter by doctor/status/date and verify correct rows

## Role Access Rules (Implemented)

- `admin`, `receptionist`: can manage patients and appointments (create/update/cancel)
- `doctor`: read-only for patients and appointment listing, but can update appointment status
