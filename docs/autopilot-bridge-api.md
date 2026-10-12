# Autopilot app ↔ Chrome gateway contract

The extension is the user's local API gateway. It keeps provider keys in the password-encrypted Chrome vault and invokes only origins the user explicitly approves. The web app issues scoped instructions and records outcomes; it never receives the user's provider key or browser cookie.

## Pairing

1. An authenticated agency/client app member opens **Connections → Chrome gateway → Pair device**. The app generates a cryptographically random, one-use code scoped to that member's workspace, with a short expiry (recommended: 5 minutes), and stores only a hash.
2. In the unlocked extension vault, the user enters the app's HTTPS origin and the code. Chrome asks to grant only that exact app origin. The extension service worker sends `POST /api/extension/pair` with `{code, device:{name,version}}`, without cookies or redirects.
3. The app atomically consumes the unexpired code, enforces current membership, creates a revocable device record, and returns `{deviceToken, workspaceName, role, expiresAt}`. It stores only a hash of the returned token. The extension stores the token inside its encrypted vault, never in page storage or logs.

## Requests

- `GET /api/extension/queue` — requires `Authorization: Bearer <deviceToken>`, returns only work authorized for the paired workspace and extension role. Page content must not be included.
- `POST /api/extension/events` — requires the same device authorization and an idempotency key; records start/complete/fail/cancel/approval event metadata, the actor/device and a bounded result summary. Never accept provider keys, cookies or raw DOM dumps.
- `POST /api/extension/disconnect` — revokes that device token, requiring the same authorization.

Every endpoint must check token hash, revocation/expiry, workspace membership and role server-side, use TLS in non-local deployments, rate-limit pairing, and audit the operation. A client-supplied workspace or role is informational only and never grants access. For local development only, `http://localhost`/`127.0.0.1` is allowed after explicit origin approval. Browser login cookies are never forwarded.

The extension requests host permission for only the app/provider origins that a user configures. Queue/result handling is an API contract, not permission to perform an arbitrary browser action. Consequential or submitted actions require a separate visible approval naming the exact target and effect.
