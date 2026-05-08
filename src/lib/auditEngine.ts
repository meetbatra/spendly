import { customAlphabet } from 'nanoid';

import { PRICING_DATA, type PricingPlan } from '@/lib/pricingData';
import type {
  AuditInput,
  AuditRecommendation,
  AuditResult,
  SavingsTier,
  ToolEntry,
  ToolId,
} from '@/types/audit';

const generateShareId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);
const LIGHT_USAGE_SPEND_THRESHOLD = 40;

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function getPlan(entry: ToolEntry): PricingPlan | undefined {
  return PRICING_DATA[entry.toolId].plans.find((plan) => plan.planId === entry.planId);
}

function getSeatPrice(entry: ToolEntry, plan: PricingPlan | undefined): number | null {
  if (plan?.monthlyPricePerSeat !== null && plan?.monthlyPricePerSeat !== undefined) {
    return plan.monthlyPricePerSeat;
  }

  if (entry.seats > 0) {
    return roundCurrency(entry.monthlySpend / entry.seats);
  }

  return null;
}

function toAnnual(monthly: number): number {
  return roundCurrency(monthly * 12);
}

function buildRecommendation(
  entry: ToolEntry,
  action: AuditRecommendation['recommendedAction'],
  monthlySavings: number,
  reasoning: string,
  overrides?: Pick<AuditRecommendation, 'recommendedPlanId' | 'recommendedToolId'>,
): AuditRecommendation {
  const normalizedMonthlySavings = roundCurrency(Math.max(0, monthlySavings));

  return {
    toolId: entry.toolId,
    currentPlanId: entry.planId,
    currentMonthlyCost: roundCurrency(entry.monthlySpend),
    recommendedAction: action,
    recommendedPlanId: overrides?.recommendedPlanId,
    recommendedToolId: overrides?.recommendedToolId,
    monthlySavings: normalizedMonthlySavings,
    annualSavings: toAnnual(normalizedMonthlySavings),
    reasoning,
    credexRelevant: false,
  };
}

function getSavingsTier(totalMonthlySavings: number): SavingsTier {
  if (totalMonthlySavings < 100) {
    return 'none';
  }

  if (totalMonthlySavings <= 300) {
    return 'low';
  }

  if (totalMonthlySavings <= 500) {
    return 'medium';
  }

  return 'high';
}

function evaluateEntry(entry: ToolEntry, input: AuditInput, allEntries: Map<ToolId, ToolEntry>): AuditRecommendation {
  const plan = getPlan(entry);
  const seatPrice = getSeatPrice(entry, plan);

  // Rule 1: Seat waste detection.
  if (plan?.isPerSeat && seatPrice !== null && entry.seats > input.teamSize) {
    const excessSeats = entry.seats - input.teamSize;
    const monthlySavings = roundCurrency(excessSeats * seatPrice);

    return buildRecommendation(
      entry,
      'downgrade',
      monthlySavings,
      `${excessSeats} seat(s) are unused because you pay for ${entry.seats} seats with a team size of ${input.teamSize}. Reducing seat count saves $${monthlySavings}/month.`,
      { recommendedPlanId: entry.planId },
    );
  }

  // Rule 2: Plan fit check for very small teams.
  if (plan?.isPerSeat && seatPrice !== null && input.teamSize <= 2) {
    const cheaperIndividualPlan = PRICING_DATA[entry.toolId].plans
      .filter(
        (candidate) =>
          !candidate.isPerSeat &&
          candidate.monthlyPricePerSeat !== null &&
          candidate.monthlyPricePerSeat > 0 &&
          candidate.monthlyPricePerSeat < seatPrice,
      )
      .sort((a, b) => (a.monthlyPricePerSeat ?? Number.POSITIVE_INFINITY) - (b.monthlyPricePerSeat ?? Number.POSITIVE_INFINITY))[0];

    if (cheaperIndividualPlan?.monthlyPricePerSeat !== null) {
      const activeSeats = Math.max(1, Math.min(entry.seats, input.teamSize));
      const monthlySavings = roundCurrency((seatPrice - cheaperIndividualPlan.monthlyPricePerSeat) * activeSeats);

      if (monthlySavings > 0) {
        return buildRecommendation(
          entry,
          'downgrade',
          monthlySavings,
          `Team size is ${input.teamSize}, so a per-seat plan is likely oversized. Switching from ${plan.planName} ($${seatPrice}/seat) to ${cheaperIndividualPlan.planName} ($${cheaperIndividualPlan.monthlyPricePerSeat}/seat-equivalent) saves about $${monthlySavings}/month.`,
          { recommendedPlanId: cheaperIndividualPlan.planId },
        );
      }
    }
  }

  // Rule 3: Redundancy detection for coding stack.
  const hasCursor = allEntries.has('cursor');
  const hasCopilot = allEntries.has('github-copilot');
  if (input.useCase === 'coding' && hasCursor && hasCopilot && entry.toolId === 'github-copilot') {
    const monthlySavings = roundCurrency(entry.monthlySpend);

    return buildRecommendation(
      entry,
      'consolidate',
      monthlySavings,
      `Cursor and GitHub Copilot overlap for coding workflows. For a coding-primary team, consolidate on Cursor and remove Copilot to save $${monthlySavings}/month.`,
      { recommendedToolId: 'cursor' },
    );
  }

  // Rule 3: Redundancy detection for writing or mixed use cases.
  const hasClaude = allEntries.has('claude');
  const hasChatGPT = allEntries.has('chatgpt');
  if ((input.useCase === 'writing' || input.useCase === 'mixed') && hasClaude && hasChatGPT) {
    const claudeEntry = allEntries.get('claude');
    const chatgptEntry = allEntries.get('chatgpt');

    if (claudeEntry && chatgptEntry) {
      const keepClaude =
        claudeEntry.monthlySpend < chatgptEntry.monthlySpend ||
        (claudeEntry.monthlySpend === chatgptEntry.monthlySpend && input.useCase === 'writing');

      const dropTool: ToolId = keepClaude ? 'chatgpt' : 'claude';
      const keepTool: ToolId = keepClaude ? 'claude' : 'chatgpt';

      if (entry.toolId === dropTool) {
        const monthlySavings = roundCurrency(entry.monthlySpend);
        return buildRecommendation(
          entry,
          'consolidate',
          monthlySavings,
          `Claude and ChatGPT are redundant for ${input.useCase} workflows. Keep ${PRICING_DATA[keepTool].displayName} and remove ${PRICING_DATA[dropTool].displayName} to save $${monthlySavings}/month.`,
          { recommendedToolId: keepTool },
        );
      }
    }
  }

  // Rule 4: API vs subscription check for light small-team usage.
  const apiAlternative: Partial<Record<ToolId, ToolId>> = {
    chatgpt: 'openai-api',
    claude: 'anthropic-api',
  };

  if (
    input.teamSize <= 2 &&
    entry.monthlySpend <= LIGHT_USAGE_SPEND_THRESHOLD &&
    plan?.monthlyPricePerSeat !== null &&
    plan?.planId !== 'free' &&
    apiAlternative[entry.toolId]
  ) {
    const alternativeToolId = apiAlternative[entry.toolId];

    return buildRecommendation(
      entry,
      'switch',
      0,
      `Low-confidence suggestion: with a ${input.teamSize}-person team and light spend ($${entry.monthlySpend}/month), usage-based API billing may be cheaper than a flat ${plan?.planName ?? 'subscription'} plan.`,
      { recommendedToolId: alternativeToolId },
    );
  }

  // Rule 5: Already optimal.
  return buildRecommendation(
    entry,
    'keep',
    0,
    `You are on the right ${plan?.planName ?? 'plan'} setup for a team size of ${input.teamSize}.`,
  );
}

export function runAudit(input: AuditInput): AuditResult {
  const toolEntries = new Map<ToolId, ToolEntry>();
  for (const entry of input.tools) {
    toolEntries.set(entry.toolId, entry);
  }

  const recommendations = input.tools.map((entry) => evaluateEntry(entry, input, toolEntries));

  const totalMonthlySavings = roundCurrency(
    recommendations.reduce((sum, recommendation) => sum + recommendation.monthlySavings, 0),
  );
  const totalAnnualSavings = toAnnual(totalMonthlySavings);
  const savingsTier = getSavingsTier(totalMonthlySavings);

  const recommendationsWithCredex = recommendations.map((recommendation) => ({
    ...recommendation,
    credexRelevant: totalMonthlySavings > 500 && recommendation.monthlySavings > 0,
  }));

  return {
    input,
    recommendations: recommendationsWithCredex,
    totalMonthlySavings,
    totalAnnualSavings,
    savingsTier,
    generatedAt: new Date(),
    shareId: generateShareId(),
  };
}
