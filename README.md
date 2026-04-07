# Pulse Check

A Next.js app for **peer performance reviews**: quarterly ratings (“Serving Client” and “Investing in the Future”), a dashboard, performance snapshots, year-in-review summaries, and promotion cases. Auth is handled by **Clerk**; data is stored in **PostgreSQL** via **Prisma**.

## Features

- **Dashboard**: Current quarter status—reviews you owe peers and ratings peers submitted about you
- **Peer reviews**: Pick peer and cycle; rate both dimensions; save draft or submit
- **Performance snapshots** (managers/admins): Quarterly trend charts from submitted ratings
- **Year in review**: Annual roll-up of quarterly ratings plus optional manager narrative
- **Promotion cases**: Create/update cases per employee and year (managers/admins edit; others read-only)
- **Roles**: `employee`, `manager`, `admin` (first synced user defaults to `admin` unless Clerk `publicMetadata.role` is set)

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Auth | Clerk |
| UI | React 19, Tailwind CSS 4 |
| Validation | Zod |

## Prerequisites

- Node.js 20+ (recommended)
- A running **PostgreSQL** instance you can connect to (local, Docker, or hosted)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create **`.env.local`** in the project root (this file is gitignored).

```env
# Database — use credentials that match your Postgres setup (see below)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Clerk — from the Clerk dashboard (API Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

Optional Clerk URLs (if you use custom sign-in/up routes, align with [Clerk Next.js docs](https://clerk.com/docs/nextjs/overview)):

```env
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
```

### 3. PostgreSQL connection

**Example (Docker)** — creates user `postgres`, database `pulse_check`:

```bash
docker run --name pulse-check-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=pulse_check \
  -p 5432:5432 -d postgres:16
```

Then:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pulse_check"
```

**macOS (Homebrew Postgres)** often has **no** `postgres` role; the superuser is usually your macOS username. If you see:

`FATAL: role "postgres" does not exist`

Either:

- Connect as your user and create a DB, e.g. `createdb pulse_check`, and set  
  `DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/pulse_check"`  
  (add `:PASSWORD` if you set a password), **or**
- Create the role:  
  `createuser -s postgres`  
  then use a URL with user `postgres`, **or**
- Use the Docker example above so the `postgres` user exists.

Test connectivity:

```bash
psql "$DATABASE_URL" -c "select 1;"
```

### 4. Prisma migrations

Apply the schema to your database:

```bash
npx prisma migrate dev --name init
```

Regenerate the client if needed:

```bash
npx prisma generate
```

### 5. Seed (optional)

Populates sample employees and review cycles (requires a working `DATABASE_URL`):

```bash
npm run db:seed
```

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to sign-in when not authenticated.

## Clerk notes

- During local development, Clerk may create a **`.clerk/`** folder (including `.clerk/.tmp/`). That directory can contain dev/keyless material—**do not commit it** (it is in `.gitignore`).
- For production, use your Clerk application’s keys in environment variables on your host (e.g. Vercel), not files under `.clerk/`.

## Project structure

```
app/
├── (app)/                 # Authenticated app shell + pages
│   ├── dashboard/
│   ├── reviews/
│   ├── snapshots/
│   ├── year-in-review/
│   └── promotion-cases/
├── (auth)/                # sign-in / sign-up
└── api/                   # e.g. reviews, year-in-review, promotion-cases upserts
lib/                       # prisma client, employees, review cycles
prisma/                    # schema, migrations, seed
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run db:seed` | Run `prisma/seed.ts` |

## Database models (overview)

- **Employee** — linked to Clerk via `clerkUserId`; role for RBAC
- **ReviewCycle** — year + quarter (1–4)
- **PeerReview** — reviewer, reviewee, cycle; two rating dimensions + comments; draft/submitted
- **YearInReview** — narrative per employee + year
- **PromotionCase** — promotion case per employee + year
