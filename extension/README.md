# Autopilot Bridge — Chrome Extension

Manifest V3 local API gateway built on the Client API Vault Relay. The encrypted vault retains provider credentials and the optional paired-app token. App pairing and queue requests go through the service worker to the explicitly approved app origin; cookies are omitted, redirects rejected, and the app must enforce tenant membership and role on every request.

## Load unpacked

1. Open `chrome://extensions` and enable Developer mode.
2. Select **Load unpacked** and choose this directory.
3. Create or unlock your local vault.
4. Under **BRIDGE**, enter the `EDGE | AGENCY` origin and the one-use code created for the selected client project (when the app supports the contract).
5. Approve only the exact origin Chrome requests.
6. Use **Pause** to stop this device's browser-session connector; workflows hosted and run on the agency server are independent of that switch.

Page indexing happens only on a click. It returns bounded visible semantic structure and excludes form values, cookies, screenshots and hidden content. It does not execute arbitrary browser actions.

See [`../docs/autopilot-bridge-api.md`](../docs/autopilot-bridge-api.md) for the companion API contract and server-side security requirements.
