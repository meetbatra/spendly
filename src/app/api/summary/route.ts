import OpenAI from 'openai';
import { z } from 'zod';

import { PRICING_DATA } from '@/lib/pricingData';
import type { AuditResult } from '@/types/audit';

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

const toolEntrySchema = z.object({
  toolId: z.string().min(1),
  planId: z.string().min(1),
  monthlySpend: z.number().nonnegative(),
  seats: z.number().int().min(1),
});

const recommendationSchema = z.object({
  toolId: z.string().min(1),
  currentPlanId: z.string().min(1),
  currentMonthlyCost: z.number().nonnegative(),
  recommendedAction: z.enum(['downgrade', 'switch', 'consolidate', 'keep']),
  recommendedPlanId: z.string().optional(),
  recommendedToolId: z.string().optional(),
  monthlySavings: z.number().nonnegative(),
  annualSavings: z.number().nonnegative(),
  reasoning: z.string().min(1),
  credexRelevant: z.boolean(),
});

const auditResultSchema = z.object({
  input: z.object({
    tools: z.array(toolEntrySchema),
    teamSize: z.number().int().min(1),
    useCase: z.enum(['coding', 'writing', 'data', 'research', 'mixed']),
  }),
  recommendations: z.array(recommendationSchema),
  totalMonthlySavings: z.number().nonnegative(),
  totalAnnualSavings: z.number().nonnegative(),
  savingsTier: z.enum(['none', 'low', 'medium', 'high']),
  generatedAt: z.union([z.string(), z.date()]).optional(),
  shareId: z.string().min(1),
  summary: z.string().optional(),
});

function getCtaSentence(totalMonthlySavings: number): string {
  if (totalMonthlySavings > 500) {
    return 'Because your savings are above $500/month, Credex can help reduce costs further with discounted AI credits at https://credex.rocks.';
  }

  return 'Share this audit link with your team lead this week and assign owners to the top savings actions.';
}

function buildSummaryPrompt(audit: AuditResult): string {
  const toolSpendByToolId = new Map(audit.input.tools.map((tool) => [tool.toolId, tool.monthlySpend]));
  const getToolName = (toolId: string): string => PRICING_DATA[toolId as keyof typeof PRICING_DATA]?.displayName ?? toolId;

  const toolsContext = JSON.stringify(
    audit.input.tools.map((tool) => ({
      toolName: getToolName(tool.toolId),
      toolId: tool.toolId,
      planId: tool.planId,
      seats: tool.seats,
      declaredMonthlySpend: tool.monthlySpend,
    })),
  );

  const recommendationsContext = JSON.stringify(
    audit.recommendations.map((recommendation) => ({
      toolName: getToolName(recommendation.toolId),
      currentPlan: recommendation.currentPlanId,
      declaredMonthlySpend: toolSpendByToolId.get(recommendation.toolId) ?? recommendation.currentMonthlyCost,
      toolId: recommendation.toolId,
      recommendedAction: recommendation.recommendedAction,
      monthlySavings: recommendation.monthlySavings,
      annualSavings: recommendation.annualSavings,
      reasoning: recommendation.reasoning,
    })),
  );

  return SUMMARY_PROMPT_TEMPLATE
    .replace('{{teamSize}}', String(audit.input.teamSize))
    .replace('{{useCase}}', audit.input.useCase)
    .replace('{{totalMonthlySavingsRaw}}', String(audit.totalMonthlySavings))
    .replace('{{totalMonthlySavingsFormatted}}', `$${audit.totalMonthlySavings}`)
    .replace('{{totalAnnualSavingsFormatted}}', `$${audit.totalAnnualSavings}`)
    .replace('{{toolsContext}}', toolsContext)
    .replace('{{recommendationsContext}}', recommendationsContext);
}

function buildFallbackSummary(audit: AuditResult): string {
  const topTwo = [...audit.recommendations]
    .sort((a, b) => b.monthlySavings - a.monthlySavings)
    .slice(0, 2);

  const recommendationLine =
    topTwo.length > 0
      ? `Your highest-impact opportunities are ${topTwo
          .map(
            (item) => `${item.recommendedAction} on ${item.toolId} (about $${item.monthlySavings}/month)`,
          )
          .join(' and ')}.`
      : 'Your current stack appears well-optimized with limited immediate reduction opportunities.';

  return `For your ${audit.input.teamSize}-person ${audit.input.useCase} team, Spendly estimated potential savings of $${audit.totalMonthlySavings}/month ($${audit.totalAnnualSavings}/year). ${recommendationLine} Prioritize the largest monthly savings first, then re-check plans quarterly as usage changes. ${getCtaSentence(audit.totalMonthlySavings)}`;
}

export async function POST(request: Request): Promise<Response> {
  let parsedAudit: AuditResult;

  try {
    const body = await request.json();
    parsedAudit = auditResultSchema.parse(body) as AuditResult;
  } catch {
    return Response.json(
      {
        summary:
          'We could not parse this audit payload, so we generated a generic summary. Review your team context and recommendations, then rerun the summary request for a personalized version.',
        source: 'fallback',
      },
      { status: 200 },
    );
  }

  const fallbackSummary = buildFallbackSummary(parsedAudit);

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ summary: fallbackSummary, source: 'fallback' }, { status: 200 });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = buildSummaryPrompt(parsedAudit);

    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
      temperature: 0.7,
      max_output_tokens: 150,
    });

    const summary = response.output_text?.trim();

    if (!summary) {
      return Response.json({ summary: fallbackSummary, source: 'fallback' }, { status: 200 });
    }

    return Response.json({ summary, source: 'ai' }, { status: 200 });
  } catch {
    return Response.json({ summary: fallbackSummary, source: 'fallback' }, { status: 200 });
  }
}
