import OpenAI from 'openai';
import { z } from 'zod';

import type { AuditResult } from '@/types/audit';

export const AUDIT_SUMMARY_PROMPT_TEMPLATE = `You are Spendly's AI advisor. Write a personalized summary in about 100 words.

Inputs:
- Team size: {{teamSize}}
- Primary use case: {{useCase}}
- Total monthly savings: {{totalMonthlySavingsFormatted}}
- Top recommendations (max 2):
{{topRecommendations}}
- Credex sentence required: {{credexSentence}}

Requirements:
- Be specific and practical.
- Mention the savings numbers directly.
- Mention the top recommendation first.
- Use a professional but conversational tone.
- End with the provided Credex sentence exactly.
- Output only the summary text.`;

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

function formatTopRecommendations(audit: AuditResult): string {
  const topTwo = [...audit.recommendations]
    .sort((a, b) => b.monthlySavings - a.monthlySavings)
    .slice(0, 2);

  if (topTwo.length === 0) {
    return '- No high-impact recommendation was detected.';
  }

  return topTwo
    .map(
      (recommendation, index) =>
        `- ${index + 1}. ${recommendation.toolId} (${recommendation.recommendedAction}) -> saves $${recommendation.monthlySavings}/month.`,
    )
    .join('\n');
}

function getCredexSentence(totalMonthlySavings: number): string {
  if (totalMonthlySavings > 500) {
    return 'Because your projected savings exceed $500/month, Credex discounted AI credits are worth evaluating next.';
  }

  return 'If your spend grows, Credex discounted AI credits can be a useful next step.';
}

function buildSummaryPrompt(audit: AuditResult): string {
  return AUDIT_SUMMARY_PROMPT_TEMPLATE
    .replace('{{teamSize}}', String(audit.input.teamSize))
    .replace('{{useCase}}', audit.input.useCase)
    .replace('{{totalMonthlySavingsFormatted}}', `$${audit.totalMonthlySavings}`)
    .replace('{{topRecommendations}}', formatTopRecommendations(audit))
    .replace('{{credexSentence}}', getCredexSentence(audit.totalMonthlySavings));
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

  return `For your ${audit.input.teamSize}-person ${audit.input.useCase} team, Spendly estimated potential savings of $${audit.totalMonthlySavings}/month ($${audit.totalAnnualSavings}/year). ${recommendationLine} Prioritize the largest monthly savings first, then re-check plans quarterly as usage changes. ${getCredexSentence(audit.totalMonthlySavings)}`;
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
      temperature: 0.4,
      max_output_tokens: 220,
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
