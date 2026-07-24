# Private Preview Gate

While the storefront is in private preview, every visitor is redirected to a
branded launch page (`/preview`) until they enter the preview password. It is
controlled entirely by two environment variables — no code changes are needed
to turn it on or off.

## Environment variables

Add these to your Oxygen environment (and local `.env`):

```
PREVIEW_MODE=true
PREVIEW_PASSWORD=your-secret-preview-password
```

- **`PREVIEW_MODE`** — the master switch. The gate is active **only** when this
  is exactly the string `true`. Any other value (or unset) leaves the store
  fully public and byte-for-byte identical to normal production.
- **`PREVIEW_PASSWORD`** — the password invited visitors type. Never committed;
  read only on the server.

## How it works

- The check runs in `server.ts` (`previewGateResponse`, from
  `app/lib/previewGate.ts`) before routing.
- A gated visitor without the `preview_access` cookie is 302-redirected to
  `/preview` (with `X-Robots-Tag: noindex, nofollow`).
- Entering the correct password sets a secure, HttpOnly `preview_access=true`
  cookie for **7 days** and returns the visitor to the page they first
  requested.
- Static assets, fonts, images, video, `favicon`, `robots.txt`, the manifest
  and `/preview` itself always stay reachable so the launch page can render.

## Change the password

Update `PREVIEW_PASSWORD` in the Oxygen environment and redeploy (or edit
local `.env` and restart). Anyone who already unlocked keeps access until their
7-day cookie expires.

## Disable the gate on launch day

Set `PREVIEW_MODE=false` (or remove it) and redeploy. The storefront is public
again immediately. No files are deleted; the launch page and gate remain in the
codebase, dormant, ready to be re-enabled.

## Change the launch copy

Edit `app/routes/preview.tsx` — the headline, subheadline, body and
“Expected launch” text are plain JSX. Styling lives in
`app/styles/preview.css`; the background photograph is set on `.ng-preview-bg`.

## Notes

- SEO: the launch page is `noindex, nofollow`, and gated requests carry the
  same `X-Robots-Tag`, so nothing is indexed while preview mode is on.
- The gate never renders the storefront header, cart, search or footer.
- The **Notify me** field is front-end only (no backend); it shows a thank-you
  state and does not persist the address yet.
