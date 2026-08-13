# PRD: R2 Upload Manager

## Summary

A small Next.js app (hosted on Vercel) that lets a few trusted friends upload event photos to **their own** Cloudflare R2 buckets. Each person signs in with Cloudflare OAuth, picks an account and a public bucket, uploads images, sees plan usage KPIs, and can copy public URLs from upload history. The app is a **dumb uploader** — no in-app file browser, delete, rename, or preview.

## Goals

- Upload images to a friend’s public R2 bucket and get shareable `r2.dev` URLs.
- Show account-wide R2 usage in layman terms (not “Class A / Class B”).
- Show cycle-to-date cost and a simple next-bill estimate.
- Persist upload history so URLs can be copied again later.
- Avoid burning R2 list/read credits on browsing — link out to the Cloudflare dashboard instead.

## Non-goals

- Listing, browsing, deleting, renaming, or previewing objects in-app.
- Managing CORS, public URL settings, or bucket creation in-app.
- Multi-tenant admin console, billing for us, or selling the product.
- Automated test suite (manual verification only; see tickets).
- Hard-blocking uploads when free allowance is exhausted (warn only).

## Users

Trusted friends who already have a Cloudflare account with R2 enabled and at least one bucket with the **public development URL** (`r2.dev`) turned on.

## Stack & constraints

| Item | Decision |
|------|----------|
| Framework | Next.js (start from the repo starter template when added) |
| Hosting | Vercel |
| Auth | Cloudflare OAuth via better-auth **generic OAuth** (no native CF provider) |
| Uploads | Next.js API route proxies upload to R2 REST using the user’s OAuth access token |
| History | Persisted in DB per logged-in Cloudflare user |
| Implementation start | Build on the Next.js starter in this repo only |
| Auth UX | Cloudflare OAuth **only** (no email/password) |
| OAuth secrets | Placeholders until a real CF OAuth client is created |

### OAuth scopes (minimum)

- Workers R2 Storage **Write** (list buckets with public domain metadata, upload objects)
- Account Analytics **Read** (operations + storage meters)
- Billing **Read** (cycle-to-date cost)

### Cloudflare facts baked into the product

- Free monthly allowance (Standard): **10 GB** storage, **1M** writes/lists, **10M** reads/checks — allowance before billing, not a hard cap.
- “Next month bill” is an **estimate**: `(usage − free allowance) × published rates`, plus cycle-to-date from Billable Usage API when available.
- GraphQL analytics are for visibility, not the official invoice.

## User journeys

### 1. Sign in and select target

1. User opens the app → signs in with Cloudflare (authorize this OAuth client).
2. If multiple accounts: pick an account.
3. App lists only buckets that already have public `r2.dev` enabled.
4. User picks one bucket → enters the main UI (gate until this is done).
5. Header shows current bucket + **Change** (re-run account/bucket pick).

### 2. Upload

1. **Upload** tab: KPI cards, upload zone / file select, **Open in Cloudflare** (dashboard deep link for the selected bucket).
2. User drops or selects one or more images (`image/*`, ≤ **10 MB** each). No batch file-count cap.
3. Per-file status (pending / uploading / done / failed) plus overall progress.
4. Object key = **filename as-is**, with correct `Content-Type` and MIME/extension sanity checks.
5. If key exists: Windows-style dialog — **Overwrite** or **duplicate** as `name (1).ext`, `name (2).ext`, with **Do this for all** for the rest of the batch.
6. On success: clear the file queue; record a **history batch** for this bucket.
7. Public URL(s):
   - One file → single URL (no comma).
   - Multiple → comma-separated list.
   - Copy available on the history action.

### 3. History

1. **History** tab, scoped to the **currently selected bucket**.
2. One row per **upload batch**.
3. Copy button returns that batch’s URL string (single URL or comma-separated).
4. Persisted across refresh/login for that Cloudflare user.

### 4. Usage KPIs

Account-wide meters on the Upload tab:

| Card | Meaning | UI label (layman) |
|------|---------|-------------------|
| Class A ops | Writes, lists, multipart, etc. | **Writes & lists** — used / free-allowance left |
| Class B ops | Reads, heads, etc. | **Reads & checks** — used / free-allowance left |
| Storage | GB-month style usage | **Storage** — used / free-allowance left |
| Cost | Billable usage + estimate | **Cost** — cycle-to-date $ + estimated next bill |

- Warn when over free allowance; do not block uploads.
- Load KPIs on login / bucket select; **manual Refresh** only (not after every upload).

## Functional requirements

### FR-Auth
- Cloudflare OAuth via better-auth generic provider.
- Store session + refresh so API routes can call Cloudflare on the user’s behalf.
- Logout clears session.

### FR-Target
- Account picker when >1 authorized account.
- Bucket picker: only buckets with public development URL (`r2.dev`).
- Block entry to tabs until account + bucket chosen.
- Persist selection for the session; Change returns to gate.

### FR-Upload
- Accept `image/*` only, max 10 MB per file.
- Reject non-images / oversize / MIME–extension mismatch with clear errors.
- Proxy upload server-side with user’s OAuth token to R2 REST.
- Conflict handling: overwrite vs ` (N)` suffix + “Do this for all”.
- Build public URL as `https://{pub-….r2.dev}/{object-key}` (proper encoding for spaces etc.).

### FR-History
- Persist batches in DB keyed by user + account + bucket.
- Batch copy payload: one URL, or comma-separated URLs.

### FR-Usage
- GraphQL (or equivalent) for writes/lists, reads/checks, storage vs free allowance.
- Billable Usage API for cycle-to-date when available.
- Client-side estimate for next bill; label as estimate.
- Refresh control on Upload tab.

### FR-Dashboard link
- Button opens Cloudflare dashboard for the selected R2 bucket (external). No in-app object listing.

## UX requirements

- Two tabs only: **Upload** | **History**.
- Upload tab = KPIs + drop zone/select + Open in Cloudflare.
- History = batch list with copy.
- No Class A/B jargon in the UI.

## Security & privacy

- Never expose long-lived R2 S3 secrets in the browser; use OAuth tokens server-side only.
- History and tokens scoped to the authenticated user.
- OAuth client registered as needed for a public app (domain verification per Cloudflare rules).

## Success criteria

- A friend can sign in, pick their public bucket, upload photos, and copy working `r2.dev` URLs.
- KPIs and cost cards update on Refresh and match “roughly” Cloudflare dashboard usage.
- Name conflicts behave like Windows (overwrite / ` (1)` / do for all).
- No object listing calls for browsing; dashboard link is the escape hatch.
- Manual test steps in each ticket pass.

## Open / deferred to implementation

- Exact dashboard deep-link URL pattern (use current `dash.cloudflare.com` account → R2 → bucket form).
- DB schema details (follow starter’s DB choice).
- Exact better-auth generic OAuth field mapping to Cloudflare OIDC/userinfo.
