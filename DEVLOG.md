# Spendly DEVLOG

## 2026-05-08

### Initial Setup
- Initialized Next.js 16 project.
- Installed Tailwind CSS v4 and configured it with PostCSS plugin.
- Added shadcn/ui and basic components (button, card, input, form, label).
- Setup Prisma ORM with standard Supabase Postgres schema.
- Setup Vitest with JSDOM and a basic math test.
- Created empty skeletons for audit logic.
- Configured GitHub Actions CI.

### Day 3

#### What I did
- Corrected Windsurf pricing to Free $0, Pro $15/month, Teams $30/user/month in code and markdown source file.
- Updated ChatGPT pricing to reflect Business plan naming (renamed from Team in August 2025) and current Business pricing ($20/user/month annual, $25/user/month monthly with 2-user minimum).
- Replaced the audit placeholder with a full deterministic rule-based engine covering seat waste, small-team plan fit, redundancy consolidation, API-vs-subscription suggestions, optimal-plan handling, savings tiering, Credex relevance gating, and share ID generation.
- Added a comprehensive Vitest suite for audit behavior and edge cases in `src/test/auditEngine.test.ts`.

#### Hours worked
FILL IN MANUALLY

#### What I learned
FILL IN MANUALLY

#### Blockers
FILL IN MANUALLY
