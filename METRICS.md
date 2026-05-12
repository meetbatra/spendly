# Spendly Metrics Plan

Spendly’s North Star metric is **PDF reports downloaded**. A download is a stronger value signal than a page view because it implies the user considered the recommendations credible enough to keep, share internally, or act on later. It is also the most likely viral vector: reports get forwarded to founders, finance, and team leads who were not in the original session.

Three input metrics should drive the North Star:

1. **Audit completion rate**
This measures the percentage of users who start the multi-step form and finish it. If completion is weak, downstream conversion and report downloads will stall regardless of recommendation quality.

2. **Recommendation relevance score**
A practical proxy is the percentage of audits containing at least one non-`keep` recommendation. If too many audits return only `keep`, users may conclude the tool is not useful or too conservative, even when technically correct.

3. **Email capture rate**
This measures whether users trust Spendly enough to continue the relationship after viewing results. It is the bridge metric between product value and GTM execution.

Instrumentation priorities should be implemented in this order:
- **Form drop-off by step** (`team context -> tool selection -> spend details`) to identify friction points and validation pain.
- **Tool selection distribution** to see which stacks are most common (e.g., Cursor + Copilot, Claude + ChatGPT + Gemini) and prioritize rule quality where usage is highest.
- **Share URL click-through** to estimate viral coefficient and understand whether users are actually circulating results.

Pivot trigger (explicit): after **500 audits**, if PDF download rate is below **5%** and email capture rate is below **10%**, then the problem is likely recommendation credibility, not visual polish. At that point, the team should not spend another cycle on cosmetic UI tweaks; it should rework core audit logic, recommendation explanations, and trust signals (e.g., clearer price provenance, stronger per-rule rationale, better mismatch detection). This trigger prevents local optimization and keeps effort focused on product-market evidence.