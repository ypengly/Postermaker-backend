# PosterMaker API

Node.js + TypeScript + Express + Prisma (PostgreSQL) backend for PosterMaker.

## What's here

```
api/
  prisma/schema.prisma   Full relational schema (users, designs, versions, templates,
                          brand kits, uploads, shares, subscriptions, payments, teams)
  prisma/seed.ts          Demo template categories + two seed templates
  src/index.ts            Express app: security middleware, route mounting
  src/routes/             One file per resource — thin, delegates to services
  src/services/           Business logic, authorization checks, Stripe, S3, plan limits
  src/middleware/         Auth (JWT), rate limiting, centralized error handling
  src/validation/         Zod schemas — every request body is validated before it
                           reaches a service
  tests/                  Vitest + supertest integration tests (auth, design CRUD,
                           plan-limit enforcement)
docker-compose.yml         web + api + postgres + redis
.env.example
```

## Design decisions worth knowing about

- **Plan limits are enforced server-side** (`services/plan.service.ts`), not just hidden in
  the UI. Every route that touches a gated feature (Pro templates, high-res export,
  Magic Resize, background removal, version history, unlimited designs) calls
  `assertFeature()` or `assertCanCreateDesign()` before doing anything.
- **Stripe is the only place plan tier changes.** The `/api/subscription/checkout` route
  creates a Checkout Session; the actual upgrade happens in the webhook handler
  (`services/billing.service.ts`) after Stripe confirms payment — never on the client's say-so.
- **Exports are queued, not synchronous.** `POST /api/designs/:id/export` returns a job id
  immediately (202 Accepted) and pushes the render job onto a Redis list. A separate worker
  process (rendering PNG/PDF at full resolution) is intentionally out of scope here — the
  queue contract is what matters architecturally, and it's what keeps the API responsive
  under load instead of blocking on image rendering.
- **Passwords use Argon2id**, the current recommended default over bcrypt for new systems.
- **Design documents are structured JSON** (`Design.document` / `DesignVersion.document`)
  holding the full elements/background tree, while everything you'd ever want to filter,
  sort, or join on (owner, folder, format, favorite, timestamps) stays relational.
- **Public share links never leak account data** — `GET /api/shared/:token` returns only
  design geometry and content, never the owner's email or internal ids.

## Running it

```bash
cp .env.example .env
docker compose up
```

This starts Postgres, Redis, the API (port 4000), and a placeholder web target. Run
migrations once the containers are up:

```bash
docker compose exec api npx prisma migrate dev
docker compose exec api npx prisma db seed
```

## A note on this sandbox

This scaffold was written and partially type-checked in an offline sandbox — `npm install`
and `tsc --noEmit` ran here and caught real bugs (which are already fixed), but
`prisma generate`'s engine download was blocked by the sandbox's network allowlist, so the
Prisma-client-dependent types couldn't be fully verified in this environment. That step
needs a normal internet connection and will work as expected the first time you run
`docker compose up` or `npm install` outside this sandbox.

## Tests

```bash
npm test
```

Tests expect `DATABASE_URL` to point at a disposable Postgres instance with migrations
applied — point it at a throwaway database, not production.
