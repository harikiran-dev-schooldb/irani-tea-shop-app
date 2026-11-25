# Irani Tea Shop Manager

An installable, responsive PWA for running a tea shop: counter orders, kitchen status, menu availability, sales, cashflow, and expenses. Data is stored in Neon PostgreSQL and the latest successful snapshot remains available when the device is offline.

## Local setup

Requires Node.js 22.13 or newer.

1. Copy `.env.example` to `.env.local`.
2. Add the pooled Neon URL as `DATABASE_URL` and the direct Neon URL as `DIRECT_DATABASE_URL`.
3. Install packages with `npm install`.
4. Apply the schema with `npm run db:migrate`.
5. Start the app with `npm run dev`.

The web manager uses the same SchoolDB WhatsApp OTP flow as Android. Production
Clerk keys for `schooldb.co.in` only work on that domain and its subdomains, so
attach the Vercel deployment to a subdomain such as `tea.schooldb.co.in`. Use
Clerk development keys in `.env.local` when testing the web login on localhost.

The menu seeds itself with the standard Irani Tea items the first time the empty database is opened.

## Commands

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run lint` — lint the codebase
- `npm run db:generate` — generate migrations after schema changes
- `npm run db:migrate` — apply migrations with `DIRECT_DATABASE_URL` (falling back to `DATABASE_URL` locally)

## API security and counter integrity

The shop requires a valid, authorised Clerk session. A caller-provided `oai-authenticated-user-id` header alone no longer grants access. A dedicated Sites integration must set the server-only `SHOP_SITES_AUTH_SECRET` and have its **trusted server ingress** provide `x-shop-sites-secret`. Never put this secret in browser or Android code.

Counter checkout now verifies prices, stock and item counts server-side. The order, payment, item lines and stock deductions are saved as one Neon HTTP batch transaction so failures roll back together. A relative `stock-adjust` action avoids lost updates when adding or subtracting menu stock.

**Reporting limitation:** The current API still returns a bounded recent history (250 orders / 500 transactions); historical all-time screen totals should not be used for accounting without a full-history report/export.

## PWA behavior

The app includes an install manifest, maskable 192px and 512px icons, iOS web-app metadata, safe-area-aware mobile navigation, and a service worker. The application shell and most recently loaded shop data remain readable offline; writes are intentionally disabled offline to avoid conflicting financial records.

## Native Android app

The `android` directory contains a native Kotlin and Jetpack Compose client. It uses the same architecture as the SchoolDB Android client: Compose screens, ViewModel state, direct REST API calls, and a device-side read cache. It is not a WebView or Capacitor wrapper.

Open `android` in Android Studio, run `adb reverse tcp:5173 tcp:5173`, and start the `app` configuration. Debug builds connect to `http://127.0.0.1:5173/` through that ADB port forward.

Override the server for a physical device or another deployment with:

```bash
cd android
./gradlew assembleDebug -PIRANI_TEA_API_BASE_URL=http://192.168.1.10:5173/
```

Release builds default to `https://tea.schooldb.co.in/`, the same authenticated production API used by the web manager. Override it with `IRANI_TEA_API_BASE_URL` only when testing another deployment.

Android authentication uses Clerk's native SDK. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in the ignored root `.env.local`; only the publishable key is compiled into Android. The API verifies every Clerk session token and permits emails listed in `SHOP_ADMIN_EMAILS` or SchoolDB admins from `SHOP_ADMIN_SCHOOL_SLUGS`. Never put `CLERK_SECRET_KEY` in Android configuration.

## Play Store release

The `play-store` directory contains the listing copy, proposed Data safety answers, release checklist, 512px icon, 1024×500 feature graphic, and five Android phone screenshots. The public privacy policy route is `/privacy`.

For signed local release builds, create an upload key and an ignored `android/keystore.properties` file with:

```properties
storeFile=app/upload-key.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=upload
keyPassword=YOUR_KEY_PASSWORD
```

Then run `cd android && ./gradlew testDebugUnitTest lintRelease bundleRelease`. For the GitHub release workflow, configure `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, and `CLERK_PUBLISHABLE_KEY` as repository secrets.

## PWA update and privacy model

The standalone PWA now exposes **Counter**, **Inventory**, and **Profit reports** launcher shortcuts. Updated installations receive an in-app refresh banner when a new service worker activates.

The service worker caches only public static assets and the generic offline page. It **never caches authenticated API responses, financial reports, session pages, or shop HTML**. An already-open authenticated tab can still show the most recent successful shop snapshot, stored per Clerk user ID in local storage. No financial edits are queued or replayed while offline, to prevent duplicate payments.

For Android use the browser Install app option. On iPhone open the site in Safari, tap Share, and choose Add to Home Screen. Fresh offline launches show a privacy-safe reconnect page instead of reusing another staff member's authenticated page.

## Online ordering (pilot)
- Customer storefront: `/order`; independent install manifest.
- Staff inbox: `/online-admin`; existing Clerk authorization.
- Run `npm run db:migrate` against a staging database first. No existing table is changed.
- Set `ONLINE_ORDERING_ENABLED=true` only after end-to-end testing and configuring edge rate limiting/bot protection for POST /api/online/orders. Phone numbers are not OTP verified; one active order per phone is enforced, not proof of identity.
- Pickup is the default. Set `ONLINE_DELIVERY_ENABLED=true` only when staff can confirm serviceability; optional `ONLINE_DELIVERY_FEE` (default 20 rupees) and `ONLINE_DELIVERY_MINIMUM` (default 99 rupees). No automatic distance validation.
- Requests do not reserve stock. Staff verify availability and phone before accepting. The existing POS checkout records collected payment, line items, stock, recipe consumption and completion atomically. Delivery fee is included in the sale total. Price changes require staff resolution; do not promise fulfillment before confirming availability. No payment gateway, automatic refunds, GPS or background push notifications.
- Test: submit a pickup order; confirm it, prepare, mark ready, record actual payment; verify POS sale and stock changes exactly once even with repeated completion. Check cancelled requests, sold-out items, changed prices, unauthorised staff API, tracking privacy, offline behavior, delivery minimum, and concurrent attempts. Do not use real customer details in staging.
