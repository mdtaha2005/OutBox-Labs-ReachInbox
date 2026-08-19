# 🚀 ReachInbox — Production-Grade Email Job Scheduler & Dashboard

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Queue-CC3534?style=flat-square&logo=redis&logoColor=white)](https://bullmq.io/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

A distributed, persistent, and rate-limited full-stack email scheduling service with an interactive outreach dashboard designed to match the ReachInbox Figma specification. Built with **Node.js, TypeScript, Express, BullMQ, Redis, PostgreSQL (Prisma), React, and Ethereal Fake SMTP**.

LOOM DEMO:https://www.loom.com/share/372a3ab9ae234bbdad6d30afe86a83f2
---

## 📑 Table of Contents

- [Key Highlights](#-key-highlights)
- [System Architecture](#-system-architecture)
- [How It Works Under the Hood](#-how-it-works-under-the-hood)
  - [1. Zero-Cron Persistent Scheduling](#1-zero-cron-persistent-scheduling)
  - [2. Persistence & Crash Recovery](#2-persistence--crash-recovery)
  - [3. Sliding-Window Rate Limiting (Redis Lua)](#3-sliding-window-rate-limiting-redis-lua)
  - [4. Distributed Concurrency & Delay Throttling](#4-distributed-concurrency--delay-throttling)
  - [5. Behavior Under Heavy Load (1,000+ Burst Emails)](#5-behavior-under-heavy-load-1000-burst-emails)
- [Feature Matrix](#-feature-matrix)
- [Tech Stack](#-tech-stack)
- [Environment Variables Setup](#-environment-variables-setup)
- [Quickstart: Running with Docker (Recommended)](#-quickstart-running-with-docker-recommended)
- [Manual Setup (Local Development)](#-manual-setup-local-development)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
- [Automated Testing & E2E Verification](#-automated-testing--e2e-verification)
- [API Reference](#-api-reference)
- [Figma Design Implementation](#-figma-design-implementation)
- [Submission & Reviewers](#-submission--reviewers)

---

## ✨ Key Highlights

- 🚫 **Strict Zero-Cron Architecture**: 100% powered by BullMQ delayed jobs and Redis sorted sets (no OS cron, `node-cron`, or `agenda`).
- 🔄 **Sliding-Window Hourly Rate Limiting**: Implemented via atomic Redis Lua scripts per sender. If the rate limit is exceeded, jobs are **never dropped**—they are automatically rescheduled into the next available hour window.
- ⏱️ **Inter-Email Delay Throttling**: Enforces configurable minimum spacing (e.g. 2s) between consecutive sends using distributed Redis slot reservations to prevent SMTP burst bans across parallel workers.
- ⚡ **Multi-Worker Concurrency**: Safe concurrent job consumption configured dynamically via environment variables.
- 💾 **Fail-Safe Persistence**: Survives container and server crashes. PostgreSQL tracks persistent email state while Redis handles queued delayed jobs. Idempotency checks guarantee zero duplicate sends upon restart.
- 📬 **Fake SMTP with Web Previews**: Integrates Nodemailer with Ethereal Email to deliver test messages and captures one-click web preview URLs for instant verification.
- 🔐 **Real Google OAuth 2.0**: Implements complete Google authentication with token verification, user profile extraction (avatar, name, email), and secure HTTP-Only JWT session cookies.
- 🎨 **Pixel-Accurate Figma Dashboard**: Modern React UI styled with Tailwind CSS, featuring search, zero-flicker background polling, rich email compose, CSV/TXT lead uploads, and email detail inspection.

---

## 🏛 System Architecture

```mermaid
flowchart TB
    subgraph Client ["Client (Browser)"]
        UI["React 18 + Vite + Tailwind UI"]
        AuthView["Google OAuth Login"]
        ComposeView["Composer + CSV Lead Parser"]
        ListsView["Scheduled & Sent Tables"]
        DetailView["Email Detail + Ethereal Preview"]
    end

    subgraph Backend ["Backend Service (Express + TypeScript)"]
        AuthCtrl["Auth Controller & Service"]
        EmailCtrl["Email Controller & Service"]
        SenderCtrl["Sender Controller"]
        RateLimiter["RateLimiterService (Redis Lua Engine)"]
        Worker["BullMQ Worker Pool (Concurrency: N)"]
    end

    subgraph Storage ["Persistence & Queue Layer"]
        PG[("PostgreSQL 16\n(Prisma ORM)")]
        Redis[("Redis 7 (AOF Persistent)\nBullMQ Delayed Jobs & Rate Limit ZSets")]
    end

    subgraph External ["External Services"]
        GoogleAuth["Google OAuth 2.0 API"]
        Ethereal["Ethereal Fake SMTP Server"]
    end

    UI -->|HTTP / REST API| Backend
    AuthView -->|OAuth Redirect & Exchange| GoogleAuth
    GoogleAuth -->|User Profile & Tokens| AuthCtrl
    Backend -->|Persist Users, Campaigns & Email Records| PG
    EmailCtrl -->|Bulk Delayed Enqueue| Redis
    Redis -->|Deliver Delayed Jobs| Worker
    Worker -->|1. Idempotency Check| PG
    Worker -->|2. Check Sliding Window Limit| RateLimiter
    RateLimiter <-->|Atomic Lua Exec| Redis
    Worker -->|3. Enforce Inter-Email Delay| RateLimiter
    Worker -->|4. Deliver Mail| Ethereal
    Worker -->|5. Update Status to SENT & Record Preview URL| PG
    Ethereal -->|HTML Web Preview Link| DetailView
```

---

## ⚙️ How It Works Under the Hood

### 1. Zero-Cron Persistent Scheduling
When a campaign is scheduled via `POST /api/emails/schedule`:
1. The backend parses leads and resolves the sender account.
2. `calculateScheduleTimes()` pre-calculates the execution timestamp for each recipient based on the user's chosen start time, inter-email delay, and hourly throughput limits.
3. Every email is saved to PostgreSQL with status `QUEUED` and a unique UUID.
4. Jobs are enqueued into BullMQ using `emailQueue.add("send-email", payload, { jobId: "job_<emailRecordId>", delay: delayMs })`.
5. Redis natively manages timer execution via internal sorted sets without any polling loops or cron libraries.

---

### 2. Persistence & Crash Recovery
- **Redis AOF Persistence**: Redis runs with `--appendonly yes` so delayed jobs and rate-limit metadata survive server reboots.
- **Worker Idempotency**: When a worker picks up a job, it queries the database before sending:
  ```typescript
  if (emailRecord.status === "SENT" || emailRecord.status === "CANCELLED") {
    return { status: "already_completed" };
  }
  ```
  If the server crashed after sending an email but before acknowledging the queue, duplicate sends are prevented.
- **DB Consistency Rollback**: If Redis fails during bulk enqueueing, all staged database records for that campaign are transitioned to `FAILED` with an error message to prevent ghost records.

---

### 3. Sliding-Window Rate Limiting (Redis Lua)
Rather than fixed-window counters that allow double-limit bursts at hourly boundaries, ReachInbox uses an atomic **sliding-window rate limiter** executed directly inside Redis via Lua:

```lua
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local window_start = now - window_ms

-- 1. Remove expired entries older than the 1-hour window
redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

-- 2. Count active sends in the current sliding 1-hour window
local current_count = redis.call('ZCARD', key)

if current_count < limit then
  -- Under limit: record send timestamp
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, window_ms)
  return {1, limit - current_count - 1, 0}
else
  -- Over limit: calculate exact wait time until oldest send expires
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldest_score = tonumber(oldest[2])
  local wait_ms = math.max(oldest_score + window_ms - now + 500, 1000)
  return {0, 0, wait_ms}
end
```

#### What happens when the limit is exceeded?
- The job is **never dropped** or marked failed.
- The worker updates the database record to `RESCHEDULED` with `actualScheduledAt = now + wait_ms`.
- The job is re-added to BullMQ with `delay: wait_ms` to execute in the next available window.

---

### 4. Distributed Concurrency & Delay Throttling
- **Configurable Worker Concurrency**: BullMQ workers process multiple jobs concurrently (`WORKER_CONCURRENCY`, default `5`).
- **Distributed Delay Slots**: To prevent parallel threads from sending emails simultaneously for the same sender, the worker executes `DELAY_SLOT_LUA` in Redis:
  ```lua
  local target_slot = math.max(now, last_slot) + delay_ms
  redis.call('SET', key, target_slot, 'PX', ttl_ms)
  return target_slot
  ```
  Workers atomically reserve delivery timestamps so consecutive emails from the same sender are cleanly spaced apart (e.g. 2 seconds minimum).

---

### 5. Behavior Under Heavy Load (1,000+ Burst Emails)
- When 1,000+ leads are scheduled for the exact same start time:
  1. The API performs a single bulk Redis enqueue pipeline (`addEmailJobsBulk`) in sub-second time.
  2. The pre-scheduler spreads the timestamps across consecutive hourly windows based on the sender's hourly limit.
  3. Runtime Lua evaluation dynamically handles any concurrency collisions or rate limit boundaries across multi-instance clusters without race conditions.

---

## 📊 Feature Matrix

### Backend Features
- [x] Express.js + strict TypeScript architecture.
- [x] BullMQ + Redis job scheduling (Strictly **zero cron**).
- [x] PostgreSQL relational storage with Prisma ORM.
- [x] Multi-sender account support with default fallback.
- [x] Automatic Ethereal SMTP account generation and custom SMTP transporter.
- [x] Atomic sliding-window rate limiting per sender.
- [x] Auto-rescheduling of over-limit jobs into the next hour window.
- [x] Inter-email delay throttling across parallel workers.
- [x] Full crash/restart recovery with database idempotency checks.
- [x] Lead parser supporting CSV, TXT, comma/newline delimiters, quote stripping, and RFC 5322 regex validation.
- [x] Full campaign cancellation removing active jobs from Redis.
- [x] Real Google OAuth 2.0 authentication with JWT verification & HTTP-only cookies.
- [x] Automated End-to-End verification script (`tests/e2e-verify.ts`).

### Frontend Features
- [x] React 18 with Vite and Tailwind CSS.
- [x] Real Google Login matching the Figma design with error feedback.
- [x] User header and sidebar with Google profile picture, name, and email.
- [x] Tab navigation ("Scheduled" and "Sent") with real-time numeric badges.
- [x] Compose modal / full view matching Figma Image 5.
- [x] CSV/TXT lead file upload with instant valid lead count badge.
- [x] Inline configuration for inter-email delay and hourly limits.
- [x] "Send Later" popover with date-time picker and presets (*Tomorrow 10 AM, 11 AM, 3 PM*).
- [x] Scheduled email list matching Figma Image 2 with orange status badges and delete/cancel action.
- [x] Sent email list matching Figma Image 3 with gray status badges.
- [x] Live Ethereal test inbox link to preview sent emails in browser.
- [x] Email Detail View matching Figma Image 4 with sender avatar and Ethereal verification badge.
- [x] Zero-flicker silent background polling every 4 seconds.
- [x] Global toast notification system.

---

## 💻 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | Node.js + Express.js (TypeScript) | RESTful API server |
| **Queue Engine** | BullMQ + ioredis | Distributed delayed job scheduling |
| **Database** | PostgreSQL 16 + Prisma ORM | Persistent relational state storage |
| **Cache & Limiter** | Redis 7 (with AOF) | Queue backend + atomic Lua sliding window |
| **SMTP Delivery** | Nodemailer + Ethereal Email | Fake SMTP testing with web previews |
| **Auth** | Google OAuth 2.0 (`google-auth-library`) + JWT | Secure user authentication |
| **Frontend UI** | React 18 + Vite + Tailwind CSS | Fast, responsive outreach dashboard |
| **Icons** | Lucide React | Clean, modern iconography |
| **DevOps** | Docker + Docker Compose | Containerized reproducible deployment |

---

## 🔐 Environment Variables Setup

### 1. Backend (`backend/.env`)

Create `backend/.env` (or copy from `backend/.env.example`):

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database & Redis
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reachinbox_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Authentication Secrets
JWT_SECRET="super_secret_jwt_key_at_least_32_chars_long_12345"
COOKIE_SECRET="super_secret_cookie_parser_secret_key_12345"

# Google OAuth 2.0 Credentials (From Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/auth/google/callback"

# Concurrency & Rate Limiting Configurations
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_EMAILS_SECONDS=2
DEFAULT_HOURLY_LIMIT=200

# Optional: Fixed Ethereal Account (Left blank, backend auto-generates test credentials on first run)
ETHEREAL_USER=
ETHEREAL_PASS=
```

### 2. Frontend (`frontend/.env`)

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🐳 Quickstart: Running with Docker (Recommended)

The easiest way to run the entire stack (PostgreSQL, Redis, Backend, and Frontend) is via Docker Compose.

```bash
# 1. Clone the repository
git clone https://github.com/mdtaha2005/OutBox-Labs-ReachInbox.git
cd OutBox-Labs-ReachInbox

# 2. Add your Google OAuth credentials to backend/.env
# (Ensure authorized redirect URI in Google Cloud Console is: http://localhost:5000/api/auth/google/callback)

# 3. Start all services in the background
docker-compose up -d --build
```

### Accessing the Applications:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000) (or `http://localhost:5173` if running locally)
- **Backend API & Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

---

## 🛠 Manual Setup (Local Development)

### Prerequisites
- Node.js 18+ installed
- PostgreSQL running locally on port `5432`
- Redis running locally on port `6379`

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Initialize Prisma & apply database migrations
npx prisma db push

# (Optional) Seed demo user & initial sender account
npm run db:seed

# Start backend in development mode (with hot reloading)
npm run dev
```

The backend server will start on `http://localhost:5000` and automatically initialize the BullMQ worker.

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The frontend dashboard will be live at `http://localhost:5173`.

---

## 🧪 Automated Testing & E2E Verification

The project includes unit tests for scheduler math and CSV parsing, as well as a full **End-to-End Verification Pipeline** that tests queueing, throttling, Ethereal fake SMTP dispatch, and metric updates.

### Run Unit Tests
```bash
cd backend
npm test
```

### Run Full End-to-End Verification
```bash
cd backend
npx tsx tests/e2e-verify.ts
```

#### What the E2E script verifies:
1. Spawns a dedicated BullMQ worker instance.
2. Schedules a campaign with 3 leads and a 2-second delay.
3. Asserts database transitions: `QUEUED` ➔ `PROCESSING` ➔ `SENT`.
4. Transmits emails over Ethereal SMTP and validates `messageId` and web preview links.
5. Queries `/api/emails/stats` to verify real-time dashboard metrics.

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/google` | Initiates Google OAuth 2.0 flow |
| `GET` | `/api/auth/google/callback` | OAuth redirect callback handler |
| `GET` | `/api/auth/me` | Fetches currently authenticated user |
| `POST` | `/api/auth/logout` | Clears authentication cookie |

### Email Scheduling & Queue
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/emails/parse-csv` | Parses CSV / TXT lead files and returns detected counts |
| `POST` | `/api/emails/schedule` | Schedules a new outreach campaign |
| `GET` | `/api/emails/scheduled` | Paginated list of scheduled/queued jobs with search |
| `GET` | `/api/emails/sent` | Paginated list of sent & failed jobs with preview URLs |
| `GET` | `/api/emails/stats` | Returns real-time counts for scheduled, sent, and failed |
| `DELETE`| `/api/emails/:id` | Cancels a scheduled email and removes it from BullMQ |

### Sender Accounts
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/senders` | Retrieves all sender accounts for the user |
| `POST` | `/api/senders` | Adds a new custom SMTP sender account |
| `POST` | `/api/senders/generate-ethereal`| Dynamically generates a new Ethereal sender |

---

## 🎨 Figma Design Implementation

The frontend UI faithfully reproduces the provided [Figma Design](https://www.figma.com/design/kOTwGlESjijCYnMgtHfvfU/Outbox-Labs-Assignment?node-id=59-4050&p=f&m=dev):

| Figma Screen | Component | Visual Implementation |
| :--- | :--- | :--- |
| **Login Screen** | `LoginPage.tsx` | Clean centered card, Google button with authentic SVG colors, and styled inputs. |
| **Scheduled Emails** | `ScheduledList.tsx` | Recipient title, orange/peach time badges (`#FFF3E0`, `#E65100`), subject snippet, and hover actions. |
| **Sent Emails** | `SentList.tsx` | Recipient name, gray `"Sent"` badge (`#ECEFF1`, `#455A64`), and direct Ethereal preview link. |
| **Email Detail View** | `EmailDetailView.tsx`| Sender avatar circle, header toolbar (Star, Archive, Trash), formatted timestamp, and Ethereal verification badge. |
| **Compose View** | `ComposeView.tsx` | From selector, CSV lead drop with parsed counter, rich text formatting bar, and floating "Send Later" popover. |

---

## 👥 Submission & Reviewers

- **Author**: Md Taha ([@mdtaha2005](https://github.com/mdtaha2005))
- **Reviewer Access Granted**:
  - `Mitrajit`
  - `Yadav036`
