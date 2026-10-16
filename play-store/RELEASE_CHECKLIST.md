# Play Store release checklist

## Completed in the repository

- Native Kotlin/Jetpack Compose Android app; no Capacitor or WebView wrapper
- Unique application ID: `com.iraniteashop.mobile`
- Target SDK 37
- Release shrinking and resource optimisation
- App backup disabled and cached shared preferences excluded from device transfer
- Internet and network-state permissions only
- Debug and release CI workflows
- Local/CI release-signing support
- App icon, feature graphic and five phone screenshots
- Store-listing copy and draft Data safety answers
- Privacy policy page at `/privacy`
- Unit tests, Android lint, debug APK and release bundle tasks

## Required before production submission

1. Clerk staff authentication is implemented, but the production Site must remain private until an authorised account has successfully signed in and the protected API has been verified. After verification, explicitly change Site access to public so Android requests can reach `/api/shop`; the API itself remains protected by Clerk.
2. Create or provide the Android upload keystore, store it securely, and configure the four GitHub Actions secrets documented in `README.md`.
3. Build the signed `.aab` and upload it to Play Console Internal testing.
4. In Play Console, complete App access with reviewer credentials, Data safety, Ads, Target audience, Content rating, and privacy-policy URL.
5. For a new personal developer account created after 13 November 2023, complete a closed test with at least 12 opted-in testers for 14 continuous days before applying for production access.

Do not publish a release that embeds a shared secret or bypass token in the Android package.
