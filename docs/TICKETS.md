# Implementation tickets

Work from the Next.js starter in this repo. Tickets marked **parallel** can start together after their dependencies are done. Each ticket ends with **Manual test** — no automated tests.

## Starter notes (read before coding)

- Follow **`AGENTS.md`** strictly (shadcn-only UI, `env.ts` / no raw `process.env`, `tryCatch`, module layout, typecheck → lint → build → format).
- Auth today is **email/password** — product replaces it with **Cloudflare OAuth only** (better-auth **generic OAuth**). Remove sign-up; sign-in becomes CF login.
- `account` table already has `accessToken` / `refreshToken` columns for OAuth.
- API = Elysia at `app/api/[[...slugs]]/route.ts`; Eden client in `lib/server.ts` (base URL = `BETTER_AUTH_URL`).
- Shared product constants: `lib/constants.ts`. Env placeholders: `.env.example`.
- OAuth credentials may be placeholders until a real CF OAuth client exists — code must still **typecheck/lint/build**.

## Parallel agent partition (local worktrees)

| Agent | Tickets | Owns |
|-------|---------|------|
| A | T1, T5 (+ T0 env CF vars) | CF OAuth, remove email/password UI, account/bucket gate |
| B | T3, T8, T8b | Cloudflare/R2 helpers, upload API, conflict handling |
| C | T2, T4, T6, T7, T9, T11 | History schema, app shell/tabs, KPIs, dashboard link, history UI, errors |
| Parent merge | T10 | Merge A→B→C, Vercel/env checklist, final verify |

Shared files (`env.ts`, `app/api/[[...slugs]]/route.ts`, `app/page.tsx`, `lib/auth.ts`) — prefer additive exports; parent resolves conflicts.

Legend: `P0` foundation · `P1` core path · `P2` polish

---

## Wave 0 — unblocker (sequential)

### T0 — Land starter & shared conventions
**Priority:** P0 · **Depends on:** your Next.js starter in the repo  
**Parallel with:** nothing (do first)

**Done when:**
- Starter is the app root (auth/DB/env patterns documented in README or `.env.example`).
- `docs/PRD.md` and `docs/TICKETS.md` remain the product source of truth.
- Shared constants stubbed: free allowances (10 GB, 1M writes/lists, 10M reads/checks), max upload **10 MB**, layman KPI labels.

**Manual test:**
1. `pnpm`/`npm` install and `dev` from starter instructions.
2. App boots on localhost without errors.
3. `.env.example` lists placeholders for CF OAuth client id/secret, app URL, DB URL.

---

## Wave 1 — foundations (run in parallel after T0)

### T1 — Cloudflare OAuth client + better-auth generic provider
**Priority:** P0 · **Depends on:** T0  
**Parallel with:** T2, T3, T4

**Implement:**
- Register Cloudflare OAuth client (scopes: R2 Write, Account Analytics Read, Billing Read, plus read needed for managed public domain).
- Wire better-auth **generic OAuth** to CF authorize / token / userinfo (or OIDC discovery).
- Login + logout UI entry points; session cookie works on Vercel-shaped local env.

**Manual test:**
1. Click Sign in with Cloudflare → consent screen appears.
2. Approve → land back in app as authenticated.
3. Refresh page → still signed in.
4. Logout → protected API/page rejects unauthenticated access.

---

### T2 — DB models for session extras + upload history
**Priority:** P0 · **Depends on:** T0 (use starter DB)  
**Parallel with:** T1, T3, T4

**Implement:**
- Store whatever better-auth needs beyond starter defaults (e.g. OAuth account id, refresh token access for server CF calls — follow starter patterns).
- `UploadBatch` (or equivalent): `userId`, `accountId`, `bucketName`, `publicBaseUrl`, `createdAt`, ordered list of `{ key, publicUrl }` (or child `UploadItem` rows).
- Migration/schema applied locally.

**Manual test:**
1. Run migrations successfully.
2. Insert a fake batch row via script or DB UI for a test user.
3. Query by `userId + accountId + bucketName` returns only that bucket’s rows.

---

### T3 — Cloudflare API helpers (server-only)
**Priority:** P0 · **Depends on:** T0  
**Parallel with:** T1, T2, T4

**Implement server modules (no UI):**
- `listAccounts` / use accounts from token context.
- `listBucketsWithPublicDevUrl(accountId)` — filter to buckets with `r2.dev` public development URL; return bucket name + public base URL.
- `headOrExists(accountId, bucket, key)` for conflict checks.
- `putObject(accountId, bucket, key, body, contentType)` via R2 REST with user bearer token.
- `getUsageMeters(accountId)` — map GraphQL action types → writes/lists vs reads/checks + storage; compute used vs free allowance.
- `getCycleToDateCost(accountId)` — Billable Usage API.
- `estimateNextBill(meters)` — `(overage) × published rates`; label as estimate.
- Dashboard URL builder for selected bucket.

**Manual test:**
1. With a personal token/OAuth access token in a one-off script or temporary route (remove before merge if unsafe): list only public buckets.
2. Upload a tiny PNG via helper → object appears in CF dashboard; public URL loads in browser.
3. Usage helper returns finite numbers (or clear error if scopes missing).
4. Estimate function: known overage inputs → expected dollar math.

---

### T4 — App shell: two tabs + gate layout
**Priority:** P0 · **Depends on:** T0  
**Parallel with:** T1, T2, T3

**Implement:**
- Layout: **Upload** | **History** tabs (disabled or gated until target selected).
- Placeholder Upload: empty KPI row, drop zone chrome, “Open in Cloudflare” button stub.
- Placeholder History: empty state.
- Header slot for current bucket + Change (wired in T5).

**Manual test:**
1. Open app (even logged-out or with mock): two tabs render; mobile width still usable.
2. Tab switch updates the main panel without full reload glitches.

---

## Wave 2 — core flows (parallel after Wave 1 pieces they need)

### T5 — Account + bucket gate
**Priority:** P1 · **Depends on:** T1, T3, T4  
**Parallel with:** T6, T7, T8 (once T1+T3 ready)

**Implement:**
- After login: if multiple accounts → account picker; then bucket picker (public `r2.dev` only).
- Persist selection in session (cookie/DB/session store — match starter).
- Block tabs until selected; header shows bucket + **Change** (clears selection → gate again).
- Empty state if no public buckets: tell user to enable Public Development URL in CF.

**Manual test:**
1. User with 1 account / 1 public bucket → auto or single-click into app.
2. User with 2 accounts → must pick account then bucket.
3. Bucket without public URL does not appear.
4. Change bucket → History/Upload target switches; gate works again.
5. Hard refresh keeps selection for the session (per session design).

---

### T6 — KPI cards + Refresh
**Priority:** P1 · **Depends on:** T1, T3, T4, T5 (needs account)  
**Parallel with:** T5 (after T3), T7, T8

**Implement:**
- Four cards + Refresh on Upload tab:
  1. Writes & lists — used / free left (+ over-allowance warning)
  2. Reads & checks — used / free left (+ warn)
  3. Storage — used / free left (+ warn)
  4. Cost — cycle-to-date + estimated next bill (clearly “estimate”)
- Fetch on target select; Refresh refetches; **do not** auto-refresh after uploads.

**Manual test:**
1. Select bucket → KPIs populate (or show explicit error if API/scope fails).
2. Refresh changes “last updated” and reloads numbers.
3. Upload files (once T8 exists) → KPIs stay stale until Refresh.
4. Labels never say “Class A” or “Class B”.

---

### T7 — Open in Cloudflare button
**Priority:** P1 · **Depends on:** T4, T5  
**Parallel with:** T6, T8, T9

**Implement:**
- Button on Upload tab opens dashboard for **selected** account + bucket in a new tab.
- No `ListObjects` (or similar) for browsing.

**Manual test:**
1. With bucket selected, click button → CF dashboard shows that bucket (or R2 area for it).
2. Network tab while using the app: no object-listing calls for a “browser” feature.

---

### T8 — Upload API + client (images, 10 MB, statuses)
**Priority:** P1 · **Depends on:** T1, T3, T5  
**Parallel with:** T6, T7, T9 (conflict UI can land as T8b if split)

**Implement:**
- Client: drag-and-drop + file picker (`multiple`), no file-count cap.
- Validate `image/*`, ≤ 10 MB, MIME/extension sanity; per-file errors.
- Per-file status + overall “N / M uploaded”.
- API route: auth required, uses OAuth token, `putObject` with Content-Type.
- On full success: clear queue; create history batch (T9 can consume same API response).
- Public URL encoding for keys with spaces (`file (1).jpg`).

**Manual test:**
1. Drop a 100 KB JPEG → success; public URL opens the image.
2. Drop a 11 MB image → rejected client-side with clear message.
3. Drop a `.pdf` or `text/plain` → rejected.
4. Drop 3 valid images → all succeed; statuses show done; queue clears.
5. Unauthenticated call to upload API → 401.

---

### T8b — Name conflict: overwrite / suffix / Do this for all
**Priority:** P1 · **Depends on:** T8  
**Parallel with:** T9, T10

**Implement:**
- Before upload (or on conflict response): if key exists → dialog **Overwrite** | **Create copy (`name (1).ext`)**.
- Checkbox **Do this for all** remaining conflicts in the batch (Windows-style).
- Suffix increments until free (` (2)`, ` (3)`, …).

**Manual test:**
1. Upload `pic.jpg` twice → second time dialog appears.
2. Choose overwrite → same public URL; content replaced.
3. Choose copy → `pic (1).jpg` URL works; original unchanged.
4. Batch of 5 all conflicting → check Do this for all + copy → get `(1)` names without 5 dialogs.
5. Do this for all + overwrite → all five overwrite without further prompts.

---

### T9 — History tab (persist + copy)
**Priority:** P1 · **Depends on:** T2, T5, T8  
**Parallel with:** T8b, T6, T7

**Implement:**
- After a successful batch, insert DB row for `user + account + bucket`.
- History tab lists batches for **current bucket only** (newest first).
- Copy button: 1 file → raw URL; many → comma-separated (no spaces unless you standardize one space after comma — pick one and stick to it; PRD allows comma-separated).
- Empty state when no history.

**Manual test:**
1. Upload one file → History shows one batch; Copy → clipboard is single URL (no comma).
2. Upload three files → one batch; Copy → three URLs comma-separated; paste works.
3. Switch bucket → History empty or other bucket’s rows only.
4. Refresh page → history still there.
5. Miss copying on Upload → History copy still works.

---

## Wave 3 — ship (parallel after core)

### T10 — Vercel env + OAuth production checklist
**Priority:** P2 · **Depends on:** T1, T5, T8  
**Parallel with:** T11

**Implement:**
- Document env vars for Vercel.
- Cloudflare OAuth redirect URL for production domain; public client domain verification if required.
- Confirm server routes never leak access tokens to the client.

**Manual test:**
1. Deploy preview/prod on Vercel.
2. Full login → pick bucket → upload → public URL → history copy on the deployed URL.
3. View page source / network: no bearer token in browser responses for HTML/JS.

---

### T11 — Error/empty copy pass
**Priority:** P2 · **Depends on:** T5–T9  
**Parallel with:** T10

**Implement:**
- Friendly errors: missing scopes, no public buckets, upload failed, usage API down.
- Disable upload while gate incomplete.
- Warn styling on KPI over-allowance.

**Manual test:**
1. Simulate/revoke a scope → UI explains reconnect/re-consent, doesn’t white-screen.
2. Account with zero public buckets → clear CTA (enable in Cloudflare).
3. Force a failed upload (e.g. revoke token mid-session) → per-file failed state + readable message.

---

## Parallel schedule (summary)

```text
T0
 ├─ T1 ─┐
 ├─ T2 ─┼─ T5 ─┬─ T6
 ├─ T3 ─┤      ├─ T7
 └─ T4 ─┘      ├─ T8 ─ T8b
               └─ T9
                    ├─ T10
                    └─ T11
```

| After | Start together |
|-------|----------------|
| T0 | T1, T2, T3, T4 |
| T1 + T3 + T4 | T5 (then T6/T7 as soon as T5 selection exists) |
| T1 + T3 + T5 | T8 |
| T8 | T8b, T9 |
| T5–T9 | T10, T11 |

---

## Suggested single-dev order

If one person: **T0 → T1 → T3 → T2 → T4 → T5 → T8 → T8b → T9 → T6 → T7 → T11 → T10**.
