# SEIIKI — Solusi Energi Kelistrikan Indonesia

Platform layanan perbaikan dan instalasi listrik untuk pelanggan, admin operasi, dan pekerja lapangan.

## Run & Operate

- `pnpm install` — install workspace dependencies
- `pnpm --filter @workspace/db run push` — apply the development PostgreSQL schema
- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run the API server
- `PORT=22402 BASE_PATH=/ pnpm --filter @workspace/seiiki-listrik run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env for the API: `DATABASE_URL` — Postgres connection string
- In Replit, use the `SEIIKI API` and `SEIIKI Web` workflows so the proxy routes `/api` and `/` correctly.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/seiiki-listrik` — React/Vite customer landing page and admin/worker dashboards
- `artifacts/api-server` — Express API routes for requests, payments, assignments, users, tools, and reports
- `lib/db/src/schema/seiiki.ts` — PostgreSQL/Drizzle schema
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `artifacts/seiiki-listrik/src/index.css` — SEIIKI visual theme tokens and layout styles

## Architecture decisions

- Visit payment is intentionally simulated and fixed at Rp25.000 until a real payment provider is connected.
- Customer location is captured as latitude/longitude and linked to Google Maps for dispatch.
- The API uses the shared `/api` proxy path; the frontend uses relative API URLs so preview and deployment share the same routing.
- Dashboard role switching is a demo access flow without account authentication.

## Public launch checklist

- Run `pnpm run build` to validate all workspace packages.
- Confirm the `SEIIKI API` and `SEIIKI Web` workflows are running.
- Add an authentication layer before using the admin and worker dashboards with real operational data.
- Publish from Replit; the web artifact is served from `artifacts/seiiki-listrik/dist/public`, while the API uses the production server defined in its artifact manifest.

## Product

- Customer submits name, WhatsApp, address, GPS location, service type, and notes.
- Customer pays the simulated visit fee, then continues to the admin WhatsApp.
- Admin reviews requests, assigns workers, updates statuses and repair estimates, manages dashboard users, reviews equipment requests, and filters transactions by period.
- Workers see assigned visits, open maps/WhatsApp, submit field notes and image/video metadata, and request equipment.

## User preferences

- User requested Indonesian copy and SEIIKI branding for the electrical service workflow.

## Gotchas

- Vite requires `PORT` and `BASE_PATH`; run the app through the configured Replit workflows rather than a root-level dev command.
- The database schema must be pushed before starting the API for the first time.
- Worker dashboard demo access currently uses worker id `1`; replace it with authenticated user context when auth is added.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
