# 🚀 ReachInbox - Full-stack Distributed Email Job Scheduler

A production-grade, distributed email scheduling service and dashboard designed to reliably schedule, throttle, and send cold outreach email campaigns at scale.

Built for the **ReachInbox Software Development Intern Assignment**.

---

## 📑 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Key System Guarantees](#-key-system-guarantees)
   - [Zero-Cron Scheduling via BullMQ](#1-zero-cron-scheduling-via-bullmq)
   - [Server Restart & Crash Persistence](#2-server-restart--crash-persistence)
   - [Distributed Sliding-Window Hourly Rate Limiter](#3-distributed-sliding-window-hourly-rate-limiter)
   - [Staggered Delay & Minimum Send Pacing](#4-staggered-delay--minimum-send-pacing)
   - [Idempotency & Duplicate-Send Prevention](#5-idempotency--duplicate-send-prevention)
3. [Tech Stack](#-tech-stack)
4. [Project Structure](#-project-structure)
5. [Prerequisites & Environment Setup](#-prerequisites--environment-setup)
6. [Running Locally](#-running-locally)
7. [Running with Docker Compose](#-running-with-docker-compose)
8. [Google OAuth Setup Guide](#-google-oauth-setup-guide)
9. [REST API Documentation](#-rest-api-documentation)
10. [Testing Strategy](#-testing-strategy)
11. [5-Minute Demo Video Checklist](#-5-minute-demo-video-checklist)

---

## 🏛 Architecture Overview

```
                      ┌─────────────────────────────────┐
                      │  Frontend Dashboard (React.js)  │
                      │  • Google OAuth Landing Page    │
                      │  • Compose Modal + CSV Parser   │
                      │  • Scheduled & Sent Lists       │
                      └────────────────┬────────────────┘
                                       │ HTTPS / REST (JWT Session)
                                       ▼
                      ┌─────────────────────────────────┐
                      │    Express.js Backend API       │
                      │  • /api/auth/google (OAuth 2.0) │
                      │  • /api/emails/schedule         │
                      │  • /api/emails/parse-csv        │
                      │  • /api/emails/scheduled & /sent│
                      └────────┬───────────────┬────────┘
                               │               │
            Prisma ORM (Async) │               │ Bulk Enqueue (Delayed)
                               ▼               ▼
           ┌──────────────────────┐  ┌──────────────────────────────────┐
           │ PostgreSQL Database  │  │        Redis 7 (AOF Enabled)     │
           │ • Users & Senders    │  │ • BullMQ Delayed ZSET (Job Queue)│
           │ • Campaigns & Records│  │ • Sliding Window Rate Limiter    │
           └──────────────────────┘  └─────────────────┬────────────────┘
                                                       │
                                  Pull Due Jobs Stream │ (concurrency: 5)
                                                       ▼
                                     ┌──────────────────────────────────┐
                                     │     BullMQ Worker Engine         │
                                     │ • Hourly Quota Check & Resched   │
                                     │ • Min Delay Interceptor (2s)     │
                                     │ • Ethereal Fake SMTP Delivery    │
                                     └─────────────────┬────────────────┘
                                                       │
                                                       ▼
                                     ┌──────────────────────────────────┐
                                     │    Ethereal SMTP Test Server     │
                                     │ • Generates Web Preview Links    │
                                     └──────────────────────────────────┘
```

---

## 🛡 Key System Guarantees

### 1. Zero-Cron Scheduling via BullMQ
- **No Cron Jobs**: Neither OS-level cron (`crontab`) nor Node cron libraries (`node-cron`, `agenda`) are used.
- **Sorted Set Precision**: When an email is scheduled for timestamp $T$, BullMQ places the job in a Redis Sorted Set (`zset`) with score = $T$ (epoch timestamp in milliseconds).
- **Atomic Transition**: Redis automatically orders jobs by due time. The BullMQ worker evaluates due jobs using native Redis stream primitives without polling or memory timers.

### 2. Server Restart & Crash Persistence
- **Redis AOF Persistence**: Redis is configured with `--appendonly yes` (`fsync everysec`). All delayed queue state is written to disk.
- **Instant Resumption**: When the Node.js backend or worker crashes and restarts:
  1. Redis still holds all scheduled timestamps in the delayed sorted set.
  2. The worker re-attaches to the queue and executes due emails at the exact scheduled second.
  3. No emails are re-sent from scratch or lost.

### 3. Distributed Sliding-Window Hourly Rate Limiter
- Configurable per-sender hourly quota (e.g. `200 emails/hour`).
- Backed by Redis Sorted Sets (`rate_limit:sender:{senderId}`) tracking send timestamps.
- **Graceful Rescheduling**: When the limit is reached:
  - The job is **not** dropped or permanently failed.
  - The worker calculates the exact millisecond delay until the oldest record in the 1-hour window expires and calls BullMQ's delay scheduler.
  - The database record transitions to `RESCHEDULED`, preserving FIFO order.

### 4. Staggered Delay & Minimum Send Pacing
- **Minimum 2-Second Delay**: Staggered schedule distribution ensures individual sends are spaced by at least `delaySeconds` (configurable).
- **Multi-Hour Batch Ingestion**: When 1,000+ leads are scheduled at once, the algorithm partitions leads into successive 1-hour window slots automatically.

### 5. Idempotency & Duplicate-Send Prevention
- **Deterministic Job IDs**: Every BullMQ job ID is assigned `job_${emailRecord.id}`, preventing duplicate entries in Redis.
- **Atomic DB State Locking**: Worker executes an atomic status check before dispatching SMTP calls.
- **Sent Acknowledgment**: Updates status to `SENT` with `etherealMessageId` and `etherealPreviewUrl`.

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | TypeScript, Express.js, Prisma ORM, BullMQ, IORedis, Nodemailer, Google Auth Library, Zod |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Axios |
| **Storage & Queue** | PostgreSQL 16, Redis 7 (AOF enabled) |
| **Email Service** | Ethereal Email (Fake SMTP for testing with web preview URLs) |
| **Authentication** | Real Google OAuth 2.0 (OpenID Connect + JWT Session Cookies) |
| **Containerization** | Docker, Docker Compose |

---

## 📂 Project Structure

```
reachinbox-assignment/
├── backend/
│   ├── src/
│   │   ├── config/          # Zod env, Redis connection, Prisma DB, Nodemailer Ethereal
│   │   ├── controllers/     # Auth (Google OAuth), Email scheduling & lists, Senders
│   │   ├── db/              # Prisma schema & seed script
│   │   ├── middlewares/     # JWT authentication middleware
│   │   ├── queue/           # BullMQ Queue instance & Worker processor
│   │   ├── services/        # Campaign scheduler, Redis rate-limiter, Google OAuth
│   │   ├── types/           # TypeScript interfaces & DTOs
│   │   ├── utils/           # Streaming CSV lead parser & schedule calculator
│   │   └── index.ts         # Express server & worker lifecycle
│   ├── tests/               # Vitest unit tests (scheduler calculations & CSV parsing)
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Header, Tabs, ScheduledTable, SentTable, ComposeModal, LoginPage
│   │   ├── services/        # Axios API client
│   │   ├── types/           # Frontend TypeScript models
│   │   ├── App.tsx          # Main dashboard & polling controller
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml       # Multi-container orchestration (Postgres, Redis, Backend, Frontend)
└── README.md
```

---

## ⚙️ Prerequisites & Environment Setup

- **Node.js**: v18+ (Tested on v22.x)
- **Docker & Docker Compose** (Recommended)
- **PostgreSQL 16** & **Redis 7** (if running without Docker)

### Backend Environment Variables (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox_db?schema=public"

# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets
JWT_SECRET=super_secret_jwt_key_at_least_32_chars_long_12345
COOKIE_SECRET=super_secret_cookie_parser_secret_key_12345

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Queue & Worker Settings
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_SECONDS=2
DEFAULT_HOURLY_LIMIT=200

# Ethereal Email (Auto-generated on startup if left empty)
ETHEREAL_USER=
ETHEREAL_PASS=
```

---

## 🚀 Running Locally

### Step 1: Start PostgreSQL and Redis (via Docker)
```bash
docker run -d --name reachinbox_postgres -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=reachinbox_db postgres:16-alpine
docker run -d --name reachinbox_redis -p 6379:6379 redis:7-alpine redis-server --appendonly yes
```

### Step 2: Initialize Backend
```bash
cd backend
npm install

# Push schema to database and generate Prisma Client
npx prisma generate --schema=src/db/schema.prisma
npx prisma db push --schema=src/db/schema.prisma

# Seed initial test account and Ethereal sender
npm run prisma:seed

# Run Unit Tests
npm test

# Start Backend in Watch Mode
npm run dev
```

Backend will be running at: `http://localhost:5000`

### Step 3: Initialize Frontend
```bash
cd ../frontend
npm install
npm run dev
```

Frontend will be running at: `http://localhost:5173`

---

## 🐳 Running with Docker Compose

To start all 4 services (PostgreSQL, Redis, Backend, and Frontend) in one command:

```bash
docker compose up --build
```

- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

---

## 🔑 Google OAuth Setup Guide

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new Project (or select existing).
3. Navigate to **APIs & Services** > **Credentials**.
4. Click **Create Credentials** > **OAuth client ID** (Application Type: *Web application*).
5. Add Authorized JavaScript origins:
   - `http://localhost:5173`
   - `http://localhost:3000`
   - `http://localhost:5000`
6. Add Authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
7. Copy the **Client ID** and **Client Secret** into `backend/.env`.

---

## 📡 REST API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/google` | Initiates Google OAuth consent flow |
| `GET` | `/api/auth/google/callback` | OAuth redirect callback handler |
| `GET` | `/api/auth/me` | Fetches authenticated user profile |
| `POST` | `/api/auth/logout` | Clears authentication session cookie |
| `POST` | `/api/emails/schedule` | Schedule a campaign (Multipart or JSON) |
| `POST` | `/api/emails/parse-csv` | Validate and extract leads from CSV/TXT |
| `GET` | `/api/emails/scheduled` | List scheduled/queued emails (paginated) |
| `GET` | `/api/emails/sent` | List sent/failed emails with Ethereal preview links |
| `DELETE` | `/api/emails/:id` | Cancel a scheduled job in Redis & DB |
| `GET` | `/api/emails/stats` | Dashboard metric counts |
| `GET` | `/api/senders` | List configured sender accounts |
| `POST` | `/api/senders/generate-ethereal` | Generate an additional test Ethereal sender |
| `GET` | `/api/health` | Healthcheck & queue config stats |

---

## 🧪 Testing Strategy

Run backend unit tests:
```bash
cd backend
npm test
```
- **Scheduler Test**: Verifies $N$-second delay pacing and multi-hour slot distribution when hourly quota is exceeded.
- **CSV Parser Test**: Verifies RFC email regex parsing, header exclusion, and deduplication.

---

## 📹 5-Minute Demo Video Checklist

1. **Google Login**: Show clicking "Continue with Google", authenticating, and redirecting to the dashboard with user name, email, and avatar.
2. **Compose Campaign**:
   - Upload a CSV or paste a lead list. Show live lead detection badge (`X valid emails detected`).
   - Set start time, minimum delay (e.g., 2s), and hourly limit.
   - Click "Schedule Campaign".
3. **Scheduled Tab**:
   - Show queued jobs in the Scheduled table with target timestamps and `Scheduled` / `Sending` badges.
   - Cancel one scheduled job to show instant removal from queue.
4. **Sent Tab & Ethereal Preview**:
   - Switch to "Sent Emails" tab.
   - Show delivered emails with timestamps and click **"Preview Email"** to open the real HTML email view rendered by Ethereal.
5. **Server Restart Persistence**:
   - Schedule emails for $T + 30$ seconds.
   - Stop the backend server process (`Ctrl+C` or `docker stop`).
   - Wait 10 seconds, then start the server again.
   - Show that jobs remain in the queue and fire accurately at their target time without duplication.