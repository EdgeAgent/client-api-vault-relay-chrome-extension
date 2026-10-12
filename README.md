# Autopilot Bridge — Client API Vault Relay

**Client-owned credentials. Agency/client handoff. Approved provider access.**

A Manifest V3 Chrome extension that continues the existing Client API Vault Relay project. It combines the password-encrypted local API vault and exact-origin consent model with a workspace pairing surface for an agency/client app. The extension is intended to be the user's local gateway: the app can authorize work and receive receipts, while API keys stay in the user's encrypted Chrome profile.

> **Integration status:** this repository implements the extension client and publishes the expected app API contract in [`docs/autopilot-bridge-api.md`](docs/autopilot-bridge-api.md). Pairing, queue sync and revocation become live only when the app implements those endpoints and tenant-scoped token rules. No connected state is fabricated when the app is absent.

## What is included

| Capability | Behavior | Boundary |
| --- | --- | --- |
| Encrypted local vault | PBKDF2-SHA-256 + AES-256-GCM encrypted credentials and paired device token; vault password is never stored. | Secrets are cleared from popup memory on lock. |
| Exact-origin provider access | Requires Chrome's point-of-use permission for a specific provider origin. | No site-wide install-time access. |
| App workspace pairing | Accepts a one-time code from an authenticated workspace and stores the returned opaque device token inside the encrypted vault. | Requires the companion app API described in the contract; app stores only a hash. |
| Local API gateway | Existing OpenAI-compatible, Gemini and Ollama adapters send provider requests from the extension worker. | Provider keys are not sent to the agency/client app. |
| Semantic page index | On a user click, reads visible headings, labels and controls from the active tab; masks sensitive fields and patterns. | No cookies, hidden content, form values, screenshots, or automatic page actions. |
| Manifest V3 package | Local popup, worker and icons in 16/32/48/128 px sizes. | No remotely loaded extension code. |

The provider catalog is discovery material only: a listing does not guarantee that a provider is free, available, or authorized. This version displays app-assigned queue metadata only. It does **not** execute arbitrary page actions; an app response is not permission to act. Destructive/submitted browser changes still need an explicit exact-action approval workflow before execution is enabled.

## Install in Chrome

1. Download `client-api-vault-relay-chrome-extension-1.1.0.zip` from [`release/`](release/), or load the unpacked `extension/` directory.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Select **Load unpacked** and choose `extension/` (or use **Load unpacked** with the extracted release archive).
4. Open the extension and create a vault with a password of at least 12 characters.
5. Add a provider from **APIs**, provide your own key, and allow only the exact provider origin when Chrome asks.
6. When the companion app supports the bridge contract, generate a one-use pairing code in its authenticated workspace and enter the app origin and code under **BRIDGE**.

The release ZIP is an installable Chrome extension, not a published Chrome Web Store listing. Store submission, listing review and distribution are separate work.

## App gateway contract

See [`docs/autopilot-bridge-api.md`](docs/autopilot-bridge-api.md) for the endpoints, one-use pairing flow, token hashing, expiry, role enforcement, idempotency and data boundaries. The extension calls only same-origin `/api/extension/*` paths over HTTPS (or explicitly granted loopback HTTP for local development), omits cookies, rejects redirects, and never transmits its provider keys.

## Development and verification

From the repo root, with dependencies installed:

```bash
pnpm run extension:validate
pnpm run extension:package
```

The validator checks Manifest V3, exact controls, package-local scripts, CSP, and valid icon dimensions. The tests cover the existing vault/provider/permission flows and the new bridge URL/response contract. The packaged ZIP excludes test files and contains only runtime assets.

## Security and data handling

- The extension encrypts credentials and the app device token in the local vault; the password is never stored.
- Host permission is optional and granted at runtime for the precise app/provider origin.
- Network calls originate in the service worker with `credentials: "omit"`, no-store caching and redirects disabled.
- The page index is only read on explicit user action. It omits input values and cookies, masks common sensitive patterns, and remains local in this version.
- App pairing must be single-use, short-lived, rate-limited, revocable and workspace-scoped. The app must hash device credentials at rest and audit every request. See the API contract.

## License

MIT; see [`LICENSE`](LICENSE). The existing icon art is retained from the original project.
