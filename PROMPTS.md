# OpenAI Summary Prompt

This project uses `src/app/api/summary/route.ts` to generate a concise 3-sentence narrative summary of audit findings.

## Exported Prompt Constant

```ts
export const SUMMARY_PROMPT_TEMPLATE = `You are Spendly's AI spend advisor.
These are POTENTIAL savings if the user takes action. The user is NOT currently saving anything. Never say they are currently saving. Always say they could save or they would save.
Write exactly 3 sentences in a friendly but professional tone.
Use no bullet points, no headers, and no markdown.

Inputs:
- Team size: {{teamSize}}
- Primary use case: {{useCase}}
- Total monthly savings (raw number): {{totalMonthlySavingsRaw}}
- Total monthly savings: {{totalMonthlySavingsFormatted}}
- Total annual savings: {{totalAnnualSavingsFormatted}}
- Tools (current plan + declared spend): {{toolsContext}}
- Recommendations (tool name + current plan + declared spend + action + monthly savings + reasoning): {{recommendationsContext}}

Requirements:
- Structure exactly:
  Sentence 1 states the single biggest specific opportunity with exact dollar amounts and exact tool names, for example: "You're paying $150/month for ChatGPT Business but your 5 seats should only cost $100, so there's $50 in unexplained overspend worth investigating immediately."
  Sentence 2 explains the overall picture: total potential monthly and annual savings across all recommendations combined, and mentions the top two tools involved by name.
  Sentence 3 is the call to action:
    - if totalMonthlySavings is 0, the final sentence must say something like: "Come back for a re-audit when your team grows or you add more paid tools."
    - if totalMonthlySavings exceeds $500, use exactly: "Credex sells discounted AI credits from companies that overforecast — you could capture even more savings at credex.rocks."
    - otherwise, use exactly: "Share this audit with your team lead this week and assign owners to each saving opportunity."
- If totalMonthlySavings is 0, never tell the user to assign owners to saving opportunities because there are none.
- Never use vague phrases like "optimize your workflow", "consider your options", or "significant opportunity".
- Always use specific tool names and specific dollar amounts from the data provided.
- Write like a sharp finance person giving direct advice to a founder, not a consultant writing a report.
- Return only the final 3-sentence summary text.`;
```

## Why This Prompt Is Structured This Way

1. **Full recommendation context (tool names + dollar amounts + reasoning)**
The model receives each recommendation with explicit costs and reasoning so every sentence can cite real numbers and concrete tools, instead of drifting into generic productivity language.

2. **Exactly 3 sentences**
Results page real estate is limited, and users need a fast “what should I do next?” read. Three sentences enforce tight narrative structure: biggest opportunity, overall picture, then call to action.

3. **Temperature `0.7`**
A moderate temperature keeps tone natural and human while still respecting the hard constraints in the prompt. Lower values became too rigid; higher values increased stylistic drift.

4. **Token cap `150`**
The route enforces a short output cap (`max_output_tokens: 150`, equivalent intent to a `max_tokens` cap) to prevent rambling text and keep summaries scannable.

## Iteration Notes (What Didn’t Work)

1. **First prompt version was too generic**
Initial outputs included vague phrases like “optimize your workflow” and “consider your options,” often without concrete dollar amounts or tool names.

2. **Template fallback for zero-savings was tried, then replaced**
A hardcoded template was introduced for zero-savings cases to avoid awkward phrasing, but that output felt robotic and unnatural. The final approach uses one stronger prompt that handles both zero and non-zero savings cases.

3. **Early wording caused incorrect “currently saving” phrasing**
A previous prompt revision had enough ambiguity that the model sometimes implied users were already saving money. The final prompt explicitly states these are potential savings and forbids “currently saving” language.