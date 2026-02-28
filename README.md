# Private Clinic Management System - Sprint 1

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
- `GET /api/appointments?date=YYYY-MM-DD`
- `POST /api/appointments`

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

## Role Access Rules (Implemented)

- `admin`, `receptionist`: can manage patients and appointments
- `doctor`: read-only access to patient list/detail and appointment list; cannot create/update/delete patients or create appointments
