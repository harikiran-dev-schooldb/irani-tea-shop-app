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

Release builds default to the current Irani Tea Sites URL. That Site must allow the Android client to reach `/api/shop`, or `IRANI_TEA_API_BASE_URL` should point to a separately hosted public/authenticated API.

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
