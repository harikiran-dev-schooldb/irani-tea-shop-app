# Irani Tea Shop Manager

An installable, responsive PWA for running a tea shop: counter orders, kitchen status, menu availability, sales, cashflow, and expenses. Data is stored in Neon PostgreSQL and the latest successful snapshot remains available when the device is offline.

## Local setup

Requires Node.js 22.13 or newer.

1. Copy `.env.example` to `.env.local`.
2. Add the pooled Neon URL as `DATABASE_URL` and the direct Neon URL as `DIRECT_DATABASE_URL`.
3. Install packages with `npm install`.
4. Apply the schema with `npm run db:migrate`.
5. Start the app with `npm run dev`.

The menu seeds itself with the standard Irani Tea items the first time the empty database is opened.

## Commands

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run lint` — lint the codebase
- `npm run db:generate` — generate migrations after schema changes
- `npm run db:migrate` — apply migrations with `DIRECT_DATABASE_URL` (falling back to `DATABASE_URL` locally)

## PWA behavior

The app includes an install manifest, maskable 192px and 512px icons, iOS web-app metadata, safe-area-aware mobile navigation, and a service worker. The application shell and most recently loaded shop data remain readable offline; writes are intentionally disabled offline to avoid conflicting financial records.
