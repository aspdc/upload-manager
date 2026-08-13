# Next.js Template

A production-ready Next.js template with Elysia API layer, Better Auth, Drizzle ORM, and shadcn/ui.

## Tech Stack

- **Framework:** Next.js 16 + React 19
- **API:** Elysia (type-safe) + Eden Treaty client
- **Auth:** Better Auth (email/password)
- **Database:** Drizzle ORM + PostgreSQL (Docker)
- **UI:** shadcn/ui + Tailwind CSS
- **Validation:** Zod + react-hook-form

## Getting Started

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
pnpm db:up

# Push schema to database
pnpm db:push

# Start dev server
pnpm dev
```

## Project Structure

```
app/
├── api/[[...slugs]]/route.ts   # Elysia catch-all
├── sign-in/page.tsx            # Sign in page
├── sign-up/page.tsx            # Sign up page
└── page.tsx                    # Home page

modules/
└── auth/
    ├── auth.route.ts           # Auth API routes (server-only)
    ├── auth.schema.ts          # Zod schemas (client-safe)
    └── index.ts                # Barrel exports

lib/
├── auth.ts                     # Better Auth config
├── auth-client.ts              # Client auth methods
├── auth-guard.ts               # Server component auth
├── server.ts                   # Eden Treaty client
├── try-catch.ts                # Error handling utility
└── utils.ts                    # cn() utility

middleware/
└── auth.ts                     # Elysia auth middleware

db/
├── index.ts                    # Drizzle client
└── schema/
    ├── auth-schema.ts          # Drizzle schema
    └── index.ts                # Barrel exports
```

## Adding Components

```bash
pnpm dlx shadcn@latest add <component-name>
```

## Database Commands

```bash
pnpm db:up          # Start PostgreSQL
pnpm db:down        # Stop PostgreSQL
pnpm db:push        # Push schema changes
pnpm db:studio      # Open Drizzle Studio
pnpm db:generate    # Generate migrations
pnpm db:migrate     # Run migrations
```

## Agent Instructions

Before making any changes to this repository, read `AGENTS.md` for coding conventions and rules.
