# Proposed Google Play Data safety answers

Review these answers against the final production authentication and hosting configuration before submission.

## Collection and security

- Does the app collect or share required user data types? **Yes — app activity / app-entered business records are transmitted to the shop backend.**
- Is all collected user data encrypted in transit? **Yes**, when the release app uses the configured HTTPS production API.
- Can users request deletion? **Yes**, through in-app supported deletion and the developer support contact for account/shop-level deletion.
- Does the app provide a way to create an account? **No**, unless authentication is later changed to self-service account creation.
- Is data collection optional? **Core shop records are required for the requested management features; customer name is optional.**

## Data types

| Play category | Collected | Shared | Purpose |
| --- | --- | --- | --- |
| Name | Optional customer name only | No | App functionality |
| Purchase history | Order items, totals and payment-method label | No | App functionality, business records |
| App interactions | Order/menu/inventory actions represented in shop records | No | App functionality |
| Financial info | Cash/online label and business totals; no card or bank credentials | No | App functionality |
| Crash logs / diagnostics | No third-party collection in the current build | No | Not applicable |
| Device or other IDs | No advertising ID or device-ID collection in the current build | No | Not applicable |
| Location, contacts, photos, audio | Not collected | No | Not applicable |

Infrastructure providers that act as service providers are used to host the app and database. Re-check this form if analytics, crash reporting, sign-in providers, payment SDKs, or advertising are added.
