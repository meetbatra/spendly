# Reflection

## 1) Hardest Bug and How It Was Solved

The hardest challenge was the audit engine behavior, not because the code was hard to write, but because “reasonable sounding” logic kept producing finance-incorrect outcomes. The first version often returned zero savings even when a human reviewer would immediately see waste. My initial hypothesis was that formulas were wrong, but deeper testing showed the bigger issue was rule ordering. Use-case mismatch checks were firing too late, after plan-fit checks, which caused absurd outcomes like recommending a downgrade for Cursor on a writing-focused team instead of flagging it as a wrong-category tool. That recommendation might be mathematically valid but decision-wise wrong.

The fix was structural: enforce use-case mismatch first and short-circuit all other rules for that tool. I also found a serious redundancy flaw: in overlap scenarios, the logic sometimes preserved the wrong tool because it prioritized one dimension (cost) without enough use-case context or vice versa. This was corrected with explicit rules for two-tool and three-tool overlap, including writing-specific behavior when Claude is present. The real breakthrough came from systematic manual testing across nine concrete scenarios (not just unit tests) with known expected outputs. That process surfaced contradictions quickly and produced rule behavior a finance person can actually defend.

## 2) A Reversed Decision

I reversed the summary strategy twice before settling on the current approach. Initially, I relied on OpenAI generation directly, but the prompt quality was weak and outputs were generic (“optimize your workflow,” “consider your options”) with little numeric specificity. To prevent awkward responses, I then introduced a template fallback path for zero-savings results, assuming deterministic text would be cleaner than inconsistent model output. It solved one problem but created another: the language felt robotic and sometimes grammatically unnatural when interpolated from tool arrays.

That led to a second reversal: instead of branching into hardcoded templated summaries, always call OpenAI but with a stricter, data-rich prompt that handles both zero-savings and positive-savings contexts. The final prompt explicitly forbids saying users are “currently saving” and reframes everything as potential savings if actions are taken. It also forces exact structure and tool/dollar specificity. The key lesson was that poor prompting is worse than templates, but well-constrained prompting beats both in readability and user trust. I stopped treating prompt design as copywriting and started treating it as product logic with acceptance criteria.

## 3) What I’d Build in Week 2

In week 2, I would prioritize automation and operational adoption over cosmetic changes. First, I would build subscription monitoring integrations (Ramp, Brex, or expense exports) so audits can run monthly without manual form entry. The current flow proves value, but recurring value needs automatic data ingestion. Second, I’d add team sharing workflows beyond static links: manager review mode, recommendation owner assignment, and status tracking (“accepted,” “rejected,” “done”). That moves Spendly from a one-time report to a lightweight cost-ops system.

Third, I’d deepen the Credex integration so high-savings users can execute immediately after diagnosis. Today, Spendly identifies opportunities and points to Credex; week 2 should connect those steps with prefilled purchase or consultation paths tied to recommendation types. Fourth, I’d add historical snapshots so teams can compare audits over time and prove realized savings versus projected savings. Finally, I’d strengthen observability: which recommendation types are ignored, which are accepted, and which produce measurable downstream conversions. That data should directly retrain rule priorities and narrative framing. The goal is to close the loop from “insight” to “decision” to “verified savings.”

## 4) AI Tool Usage: What Helped and What Failed

AI tools were useful at different layers, but only when constrained. I used Claude for high-level thinking: clarifying problem framing, pressure-testing architecture choices, and discussing edge cases before implementation. I used Codex and GitHub Copilot for execution speed in TypeScript/Next.js workflows, especially repetitive scaffolding and endpoint shaping. Where AI consistently failed was the finance-defensible logic layer of the audit engine. It often produced outputs that looked plausible in prose but broke under scenario testing.

A concrete failure was redundancy handling. One generated revision chose a keep/remove pattern that looked cost-efficient in isolation but violated use-case fitness in writing-heavy teams. For example, it preserved the cheaper tool by default even when that conflicted with the explicitly preferred writing tool behavior. Another recurring issue was language ambiguity in summary text, where models implied users were already saving money rather than describing potential savings. These were not syntax bugs; they were product-trust bugs. The takeaway: AI is excellent for acceleration and draft generation, but for decision logic that affects perceived financial credibility, manual scenario testing and hard acceptance rules are non-negotiable.

## 5) Self-Rating

**Discipline: 7/10.** Branching and iterative commits were mostly consistent, but execution cadence was uneven early in the week. Once implementation started, flow improved and merges became cleaner.

**Code quality: 7/10.** TypeScript strictness, rule tests, and API validation are in place, and the engine is materially stronger than v1. However, some route/components are now large and should be split for maintainability.

**Design sense: 7/10.** The UI improved significantly after dashboard and visualization passes, and the results page is now more credible and scan-friendly. There is still work to do on spacing consistency, mobile edge cases, and formal performance/accessibility review.

**Problem solving: 8/10.** The biggest wins came from structured scenario testing and willingness to reverse decisions quickly when evidence contradicted assumptions. That process caught multiple logic errors AI-generated code would have left in production.

**Entrepreneurial thinking: 8/10.** GTM and economics thinking stayed concrete: targeted user profile, zero-budget distribution plan, and explicit funnel math tied to Credex conversion value. Next improvement is validating assumptions with real user behavior data rather than modeled projections.
