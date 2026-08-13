<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Repository Rules

**IMPORTANT: Read these instructions before making any changes to this repository.**

## 1. UI Components — shadcn Only

Strictly use shadcn components for all UI elements. Do not install or use third-party UI libraries.

If a component does not exist, add it using:

```bash
pnpm dlx shadcn@latest add <component-name>
```

Available components are in `components/ui/`. Never create custom UI primitives when a shadcn equivalent exists.

```tsx
// CORRECT — use shadcn Button
import { Button } from "@/components/ui/button"
<Button variant="outline" size="sm">Cancel</Button>

// WRONG — creating a custom button
<button className="rounded bg-blue-500 px-4 py-2 text-white">Click</button>
```

## 2. No Hardcoded Measurements — Use Design Tokens

Strictly use Tailwind CSS utility classes and the design tokens defined in `app/globals.css`. Never use hardcoded pixel values, rem values, arbitrary values in brackets, or inline styles for spacing, sizing, colors, or typography.

**Tokens available in `app/globals.css`:**

| Token | Usage |
|-------|-------|
| `--background` / `--foreground` | Page background and text |
| `--card` / `--card-foreground` | Card surfaces |
| `--primary` / `--primary-foreground` | Brand/action color |
| `--secondary` / `--secondary-foreground` | Secondary actions |
| `--muted` / `--muted-foreground` | Subtle backgrounds and text |
| `--accent` / `--accent-foreground` | Highlights |
| `--destructive` | Errors and warnings |
| `--border` / `--input` / `--ring` | Borders, inputs, focus rings |
| `--radius` | Base border radius |

```tsx
// CORRECT — use design tokens and Tailwind scale
<div className="p-4 gap-6 max-w-md">
  <Button className="h-10 px-4 text-sm">Submit</Button>
  <p className="text-muted-foreground text-sm">Hint text</p>
  <div className="rounded-lg border border-border bg-card p-6">
    <h2 className="text-card-foreground text-lg font-semibold">Card</h2>
  </div>
</div>

// WRONG — hardcoded values, arbitrary values, inline styles
<div style={{ padding: "16px", gap: "24px", maxWidth: "448px" }}>
  <button style={{ height: "40px", padding: "0 16px", fontSize: "14px" }}>
    Submit
  </button>
  <p className="bg-red-500 p-[50px] text-[#888] text-[14px]">Bad</p>
</div>
```

## 3. Environment Variables

Always use `env.ts` (server) or `clientEnv` from `env.ts` (client) to access environment variables. Never use `process.env` directly in application code.

When adding or modifying env vars:

1. Update `env.ts` with the Zod schema
2. Update `.env.example` with a placeholder value

**Rules for `env.ts`:**

- No default values — every env var must be explicitly defined by the user
- Use `z.url()` for URLs, `z.string().min(1)` for required strings, `z.enum()` for allowed values
- Never use `z.default()` or optional (`z.optional()`) on env vars

```ts
// CORRECT — standalone validators, no defaults
DATABASE_URL: z.url()
BETTER_AUTH_SECRET: z.string().min(1)
NODE_ENV: z.enum(["development", "production", "test"])

// WRONG — chained validators, defaults, optional
DATABASE_URL: z.string().url()
APP_NAME: z.string().min(1).default("my-app")
DEBUG: z.boolean().optional()
```

**Zod v4 error handling:**

Do not use `parsed.error.flatten()` — it is deprecated in Zod v4. Use `parsed.error.issues` instead:

```ts
// CORRECT — use .issues
const issues = parsed.error.issues
  .map((i) => `${i.path.join(".")}: ${i.message}`)
  .join("\n")

// WRONG — flatten() is deprecated in Zod v4
parsed.error.flatten().fieldErrors
```

## 4. Error Handling — tryCatch Utility

Never use raw try-catch blocks. Always use the `tryCatch` utility from `lib/try-catch.ts`:

```ts
import { tryCatch } from "@/lib/try-catch"

// CORRECT — use tryCatch
const { data, error } = await tryCatch(someAsyncOperation())
if (error) {
  return { error: error.message }
}

// WRONG — raw try-catch
try {
  const data = await someAsyncOperation()
  return { data }
} catch (error) {
  return { error: error.message }
}
```

## 5. Forms — react-hook-form + Zod

Use `react-hook-form` with `@hookform/resolvers` and Zod for all forms. Validation schemas go in the feature's module folder following the convention:

```
modules/<feature>/<feature>.schema.ts
```

Export both the schema and its inferred type:

```ts
// CORRECT — standalone validators in module schema
export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})
export type SignInInput = z.infer<typeof signInSchema>

// WRONG — inline schema, chained validators
const schema = z.object({
  email: z.string().email(),
  password: z.string(),
})
```

## 6. Feature Module Structure

Follow this structure for all features:

```
modules/<feature>/
├── <feature>.route.ts    # Server-only (Elysia routes, DB queries)
├── <feature>.schema.ts   # Client-safe (Zod schemas, types)
└── index.ts              # Barrel export (client-safe only)
```

The barrel `index.ts` must never re-export server-only modules (anything that imports `db`, `auth`, or Node.js built-ins). Import server modules directly where needed.

```ts
// CORRECT — barrel export only client-safe items
export { signInSchema, signUpSchema } from "./auth.schema"
export type { SignInInput, SignUpInput } from "./auth.schema"

// WRONG — re-exporting server-only route
export { authRoutes } from "./auth.route"
```

## 7. Auth

- Auth config: `lib/auth.ts`
- Auth client: `lib/auth-client.ts`
- Auth guard (server components): `lib/auth-guard.ts`
- Auth middleware (Elysia): `middleware/auth.ts`
- Auth pages: `app/sign-in/page.tsx`, `app/sign-up/page.tsx`
- Auth routes: `modules/auth/auth.route.ts`

```ts
// Server component — use auth guard
import { requireSession } from "@/lib/auth-guard"

export default async function DashboardPage() {
  const { user } = await requireSession()
  return <div>Welcome {user.name}</div>
}

// Client component — use auth client
import { signIn } from "@/lib/auth-client"

const { data, error } = await signIn(email, password)
```

## 8. Database

- Drizzle config: `drizzle.config.ts`
- Schema: `db/schema/`
- DB client: `db/index.ts`
- Docker: `docker-compose.yml` (Postgres on port 54321)

Use `pnpm db:push` to sync schema, `pnpm db:studio` to inspect data.

```ts
// Import db client
import { db } from "@/db"
import { user } from "@/db/schema"

// Query example
const users = await db.select().from(user)
```

## 9. API Layer

- Elysia catch-all: `app/api/[[...slugs]]/route.ts`
- Eden client: `lib/server.ts`
- Add new routes as feature modules under `modules/`

```ts
// Add new route in modules/<feature>/<feature>.route.ts
import { Elysia, t } from "elysia"

export const featureRoutes = new Elysia()
  .get("/items", () => ({ items: [] }))
  .post("/items", ({ body }) => body, {
    body: t.Object({ name: t.String() }),
  })

// Mount in app/api/[[...slugs]]/route.ts
import { featureRoutes } from "@/modules/feature/feature.route"
const app = new Elysia({ prefix: "/api" })
  .use(authRoutes)
  .use(featureRoutes)
```

## 10. Conventions

- Use `@/` path alias for all imports (maps to project root)
- Client components: add `"use client"` at top of file
- Server components: default, no directive needed
- Use `cn()` from `lib/utils.ts` for conditional class merging
- Use `Spinner` from `components/ui/spinner.tsx` for loading states
- Never add comments to code unless explicitly requested

```tsx
// CORRECT — proper conventions
"use client"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

function MyComponent({ className }: { className?: string }) {
  return <div className={cn("p-4", className)}><Spinner /></div>
}

// WRONG — missing "use client", no cn(), raw class concatenation
function MyComponent(props) {
  return <div className={"p-4 " + props.className}>...</div>
}
```

## 11. Build Verification — Always Pass Before Submitting

Before considering any task complete, you **must** run the following checks in order. Fix any failures before proceeding.

### Step 1: Typecheck

```bash
pnpm typecheck
```

Catches TypeScript errors. Must pass with zero errors.

### Step 2: Lint

```bash
pnpm lint
```

Catches code quality issues. Must pass with zero errors.

### Step 3: Build

```bash
pnpm build
```

Verifies production build succeeds. This is the final gate — if this fails, the code is not shippable.

### Step 4: Format

Only run **after** all checks above pass:

```bash
pnpm format
```

Normalizes code style across all files.

**Summary order:** `typecheck` → `lint` → `build` → `format`

Do not skip steps. Do not commit until `build` passes cleanly.
