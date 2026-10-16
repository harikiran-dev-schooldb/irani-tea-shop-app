# Irani Tea Android

Native Android shop manager built with Kotlin and Jetpack Compose. This is a native client, not a WebView.

## Included

- Dashboard with daily sales, net cash, active orders, and low-stock counts
- Counter ordering with cart, cash/online payment, and stock-aware quantities
- Kitchen order status workflow
- Menu availability and low-stock visibility
- Sales and expense reporting
- Expense entry
- Cached read-only shop snapshot when the server is unavailable
- Configurable emulator, physical-device, and production API URLs

## Run locally

1. Start the web API from the repository root with `npm run dev`.
2. Open this `android` directory in Android Studio.
3. Let Android Studio install JDK 17 and the required Android SDK if prompted.
4. Forward the local API port, then run the `app` configuration on an emulator:

   ```bash
   adb reverse tcp:5173 tcp:5173
   ```

The debug app connects to `http://127.0.0.1:5173/` through that ADB port forward. Repeat the command after restarting the emulator. For a physical device running through Android Studio/ADB, the same forwarding command works; alternatively, provide your computer's LAN address and the port printed by the dev server:

```bash
./gradlew assembleDebug -PIRANI_TEA_API_BASE_URL=http://192.168.1.10:5173/
```

For a deployed API:

```bash
./gradlew assembleRelease -PIRANI_TEA_API_BASE_URL=https://your-host.example/
```

Release builds use `https://tea.schooldb.co.in/` by default. The override above
is only needed for a different test or production host.

Production builds reject cleartext HTTP traffic. Writes always require a connection; the most recent successful response remains available offline for reading.

## Signed releases

Release signing uses `android/keystore.properties` when present:

```properties
storeFile=release.jks
storePassword=your-store-password
keyAlias=your-key-alias
keyPassword=your-key-password
```

The `Android Release Artifacts` GitHub Actions workflow creates signed APK and Play Store AAB artifacts from `v*` tags. Configure the four Android signing secrets referenced by that workflow before creating a release tag.

## Verify

```bash
./gradlew testDebugUnitTest lintDebug assembleDebug
```
