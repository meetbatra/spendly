# Automated Tests

## 1) `__tests__/math.test.ts`

- **What it covers:** Placeholder sanity test to confirm test runner wiring and baseline assertion behavior.
- **Run command:**

```bash
npx vitest run __tests__/math.test.ts
```

- **Test cases:**
1. `should pass a basic test` — verifies `1 + 1 === 2`.

## 2) `src/test/auditEngine.test.ts`

- **What it covers:** End-to-end rule validation for `runAudit` in `src/lib/auditEngine.ts`, including savings math, redundancy behavior, rule gating, tiering, and metadata generation.
- **Run command:**

```bash
npx vitest run src/test/auditEngine.test.ts
```

- **Test cases:**
1. `detects declared spend mismatch when spend is over 20% above expected plan cost` — checks Rule 1 overspend detection and savings delta.
2. `detects seat waste on per-seat plans using wasted seats * seat price` — checks Rule 2 seat waste math.
3. `flags small team on team plan and recommends cheaper individual plan` — checks Rule 3 downgrade recommendation.
4. `removes the more expensive tool for Cursor plus GitHub Copilot redundancy (Cursor expensive)` — checks two-tool redundancy remove-expensive behavior.
5. `removes the more expensive tool for Cursor plus GitHub Copilot redundancy (Copilot expensive)` — mirror case for opposite spend ordering.
6. `removes the more expensive tool for Cursor plus Windsurf redundancy` — checks competitor overlap consolidation.
7. `removes the more expensive tool for Claude plus ChatGPT two-way redundancy` — checks writing/mixed overlap consolidation.
8. `triple redundancy removes two tools and keeps one` — verifies three-tool overlap removes two and totals savings correctly.
9. `in writing use case triple redundancy keeps Claude when Claude is present` — verifies use-case-aware keep target for writing teams.
10. `flags use-case mismatch when writing team pays for Cursor` — checks mismatch short-circuit behavior.
11. `adds high spend per developer stack alert with 20% savings estimate` — checks stack-level alert and conservative estimate.
12. `calculates savingsTier as none, low, medium, and high` — validates all tier boundaries.
13. `gates credexRelevant by total savings > $500 and recommendation savings > 0` — checks CTA relevance gating.
14. `returns keep only when no optimization rule matches the tool` — validates explicit keep fallback path.
15. `flags OpenAI API plus ChatGPT subscription overlap for technical teams` — checks API-vs-subscription overlap rule.
16. `generates share ids and valid generatedAt timestamp` — checks metadata generation integrity.

## Run All Tests

```bash
npx vitest run
```

CI is configured to run the test suite automatically on every push to `main`.
