# Spendly Architecture

## System Diagram

```mermaid
flowchart TD
  U[User lands on / homepage] --> A[Click Audit My Stack]
  A --> B[/audit multi-step form]
  B --> C[Zustand store + React Hook Form + Zod]
  C --> D[Assemble AuditInput]
  D --> E[runAudit in src/lib/auditEngine.ts]
  E --> F[AuditResult generated locally]
  F --> G[POST /api/audit]
  G --> H[Rate limit check (Upstash)]
  H --> I[Prisma create audit]
  I --> J[(Supabase Postgres)]
  G --> K[Return shareId]
  K --> L[Navigate /results/[shareId]]
  L --> M[Server component fetch via Prisma]
  M --> N[Render dashboard + recommendations + charts]
  N --> O{Summary exists?}
  O -- Yes --> P[Render stored summary]
  O -- No --> Q[Client POST /api/summary]
  Q --> R[OpenAI gpt-4o-mini summary]
  R --> S[Render AI summary]
  N --> T[Download PDF -> GET /api/report/[id]]
  T --> U2[PDF buffer via @react-pdf/renderer]
  N --> V[Lead dialog submit]
  V --> W[POST /api/capture]
  W --> X[Rate limit + honeypot + Zod validation]
  X --> Y[Prisma save lead]
  Y --> J
  W --> Z[Send full report email via Resend]
```

## Data Flow

1. A user starts at the landing page and opens `/audit`.
2. The audit wizard stores all form state in `src/store/auditStore.ts` (team size, use case, selected tools, per-tool entries), persisted with localStorage under `spendly-audit-form`.
3. On step completion, React Hook Form + Zod validate each stage; the final step assembles a typed `AuditInput`.
4. `runAudit` in `src/lib/auditEngine.ts` applies deterministic rules (use-case mismatch, spend mismatch, seat waste, team-plan fit, redundancy, stack spend alert) and returns `AuditResult` with totals, tier, recommendations, and shareId.
5. The client posts this full `AuditResult` to `POST /api/audit`.
6. `/api/audit` validates payload shape, optionally applies Upstash rate limiting (toggleable via `ENABLE_AUDIT_RATE_LIMIT`), then writes the record with Prisma into Supabase Postgres (`audit` table JSON fields for tools and recommendations).
7. The client navigates to `/results/[shareId]` using the API-returned shareId (or local fallback if save fails).
8. `src/app/results/[id]/page.tsx` is a server component that queries Prisma by shareId, renders KPI cards/charts, per-tool recommendation cards, and conditional Credex CTA.
9. If summary is missing, `SummaryClient` calls `POST /api/summary` with the audit payload; that route builds the `SUMMARY_PROMPT_TEMPLATE`, calls OpenAI (`gpt-4o-mini`), and returns a 3-sentence summary with a fallback if needed.
10. Lead capture in the results page submits to `POST /api/capture`, which validates email + auditId, applies honeypot/rate-limit checks, stores lead data, and sends a full report-style email through Resend.
11. PDF export uses `GET /api/report/[id]`, loads the audit via Prisma, builds a PDF from `src/lib/reportPdf.tsx`, and returns it as a downloadable file.

## Stack Justification

### Next.js 16 App Router
Server components simplify data-fetching for results pages while keeping client-side interactivity isolated to form and dialog components. Route handlers (`/api/*`) and UI colocation keep ownership clear per feature.

### Supabase (Managed Postgres)
Supabase provides managed Postgres with operational simplicity, backup tooling, and good startup ergonomics. Using pooled runtime URLs with PgBouncer reduces serverless connection pressure.

### Prisma
Prisma provides type-safe queries, schema management, and consistent data access patterns across all server code. It also minimizes drift between API shape and DB shape during rapid iteration.

### Tailwind CSS v4
Tailwind v4 gives a fast styling loop with low CSS overhead and lets the UI evolve quickly as product direction changes. The CSS-first setup also keeps style concerns localized to components.

### Upstash (Rate Limiting)
Upstash works well in serverless environments and gives straightforward per-IP sliding-window limits for abuse control on audit submission and lead capture endpoints.

## Scaling to 10,000 Audits/Day

1. Add a Redis cache layer for repeated audit patterns: hash normalized `AuditInput` and cache deterministic `runAudit` outputs so identical stacks return instantly.
2. Upgrade to Supabase Pro for higher concurrent connection limits and stronger performance envelopes, while keeping pooled/direct URL split for runtime vs CLI.
3. Move summary generation to a queue-based async pipeline to smooth OpenAI traffic spikes and avoid route-level latency/rate pressure (store pending state, process via worker).
4. Evaluate edge runtime for lightweight audit submission/read paths where Prisma constraints allow, keeping heavy DB and PDF work on Node runtime.
5. Long-term: embed Spendly directly in Credex so users can move from diagnosis (audit) to execution (purchase/manage discounted AI credits) in one workflow.