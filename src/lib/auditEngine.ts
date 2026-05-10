import { customAlphabet } from 'nanoid';

import { PRICING_DATA, type PricingPlan } from '@/lib/pricingData';
import type {
  AuditInput,
  AuditRecommendation,
  AuditResult,
  SavingsTier,
  ToolEntry,
  ToolId,
  UseCase,
} from '@/types/audit';

const generateShareId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

type RuleId =
  | 'rule1_mismatch'
  | 'rule2_seat_waste'
  | 'rule3_small_team'
  | 'rule4_redundancy'
  | 'rule5_use_case_mismatch';

interface RecommendationCandidate {
  ruleId: RuleId;
  toolId: ToolId;
  currentPlanId: string;
  currentMonthlyCost: number;
  recommendedAction: AuditRecommendation['recommendedAction'];
  recommendedPlanId?: string;
  recommendedToolId?: ToolId;
  monthlySavings: number;
  reasoning: string;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function toAnnual(monthly: number): number {
  return roundCurrency(monthly * 12);
}

function getPlan(entry: ToolEntry): PricingPlan | undefined {
  return PRICING_DATA[entry.toolId].plans.find((plan) => plan.planId === entry.planId);
}

function getPlanSeatPrice(plan: PricingPlan | undefined): number | null {
  if (!plan || plan.monthlyPricePerSeat === null || plan.monthlyPricePerSeat === undefined) {
    return null;
  }

  return plan.monthlyPricePerSeat;
}

function getExpectedPlanCost(entry: ToolEntry, plan: PricingPlan | undefined): number | null {
  const seatPrice = getPlanSeatPrice(plan);

  if (seatPrice === null) {
    return null;
  }

  const seatCount = Math.max(1, entry.seats);
  return roundCurrency(seatPrice * seatCount);
}

function isFreePlanZeroSpend(entry: ToolEntry, plan: PricingPlan | undefined): boolean {
  return (plan?.monthlyPricePerSeat ?? null) === 0 && roundCurrency(entry.monthlySpend) === 0;
}

function buildCandidate(input: Omit<RecommendationCandidate, 'monthlySavings'> & { monthlySavings: number }): RecommendationCandidate {
  return {
    ...input,
    monthlySavings: roundCurrency(Math.max(0, input.monthlySavings)),
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

function addCandidate(map: Map<ToolId, RecommendationCandidate[]>, candidate: RecommendationCandidate): void {
  const current = map.get(candidate.toolId) ?? [];
  current.push(candidate);
  map.set(candidate.toolId, current);
}

function getRulePriority(ruleId: RuleId): number {
  switch (ruleId) {
    case 'rule1_mismatch':
      return 1;
    case 'rule2_seat_waste':
      return 2;
    case 'rule3_small_team':
      return 3;
    case 'rule4_redundancy':
      return 4;
    case 'rule5_use_case_mismatch':
      return 5;
    default:
      return 99;
  }
}

function getSingleToolKeepReason(entry: ToolEntry, plan: PricingPlan | undefined, useCase: UseCase): string {
  if (plan?.planId === 'pro' && entry.toolId === 'claude') {
    return 'Claude Pro at $20/month is the right plan for an individual or small team focused on writing.';
  }

  if (plan?.planId === 'pro' && entry.toolId === 'cursor') {
    return `Cursor Pro at $20/user matches a ${useCase} workflow without unnecessary team-plan overhead.`;
  }

  if (plan?.planId === 'plus' && entry.toolId === 'chatgpt') {
    return 'ChatGPT Plus at $20/month is cost-efficient for focused individual usage.';
  }

  const seatPrice = getPlanSeatPrice(plan);
  if (seatPrice !== null) {
    return `${plan?.planName ?? entry.planId} at $${seatPrice}/seat matches your declared team setup and spend profile.`;
  }

  return `${plan?.planName ?? entry.planId} aligns with your current usage profile and has no obvious savings gap.`;
}

export function runAudit(input: AuditInput): AuditResult {
  const entryByTool = new Map<ToolId, ToolEntry>();
  const planByTool = new Map<ToolId, PricingPlan | undefined>();
  const auditableEntries: ToolEntry[] = [];

  for (const entry of input.tools) {
    const plan = getPlan(entry);
    planByTool.set(entry.toolId, plan);

    if (isFreePlanZeroSpend(entry, plan)) {
      continue;
    }

    entryByTool.set(entry.toolId, entry);
    auditableEntries.push(entry);
  }

  const candidateMap = new Map<ToolId, RecommendationCandidate[]>();

  // Rule 1 — Declared spend vs plan price mismatch.
  for (const entry of auditableEntries) {
    const plan = planByTool.get(entry.toolId);
    const expectedPlanCost = getExpectedPlanCost(entry, plan);

    if (expectedPlanCost !== null && expectedPlanCost > 0 && entry.monthlySpend > expectedPlanCost * 1.2) {
      const savings = roundCurrency(entry.monthlySpend - expectedPlanCost);

      addCandidate(
        candidateMap,
        buildCandidate({
          ruleId: 'rule1_mismatch',
          toolId: entry.toolId,
          currentPlanId: entry.planId,
          currentMonthlyCost: entry.monthlySpend,
          recommendedAction: 'switch',
          recommendedPlanId: entry.planId,
          monthlySavings: savings,
          reasoning: `You declared $${entry.monthlySpend}/month but ${plan?.planName ?? entry.planId} costs $${expectedPlanCost} for ${entry.seats} seat(s). You may have unused seats or be on a higher plan than you think. Switching to the correct plan saves $${savings}/month.`,
        }),
      );
    }
  }

  // Rule 2 — Seat waste.
  for (const entry of auditableEntries) {
    const plan = planByTool.get(entry.toolId);
    const seatPrice = getPlanSeatPrice(plan);

    if (plan?.isPerSeat && seatPrice !== null && entry.seats > input.teamSize) {
      const wastedSeats = entry.seats - input.teamSize;
      const savings = roundCurrency(wastedSeats * seatPrice);

      addCandidate(
        candidateMap,
        buildCandidate({
          ruleId: 'rule2_seat_waste',
          toolId: entry.toolId,
          currentPlanId: entry.planId,
          currentMonthlyCost: entry.monthlySpend,
          recommendedAction: 'downgrade',
          recommendedPlanId: entry.planId,
          monthlySavings: savings,
          reasoning: `${wastedSeats} seat(s) are unused on ${plan.planName} at $${seatPrice}/seat. Removing those seats saves $${savings}/month.`,
        }),
      );
    }
  }

  // Rule 3 — Small team on team plan.
  if (input.teamSize <= 3) {
    for (const entry of auditableEntries) {
      const plan = planByTool.get(entry.toolId);
      const seatPrice = getPlanSeatPrice(plan);

      if (!plan?.isPerSeat || seatPrice === null) {
        continue;
      }

      const cheaperIndividualPlan = PRICING_DATA[entry.toolId].plans
        .filter(
          (candidate) =>
            !candidate.isPerSeat &&
            candidate.monthlyPricePerSeat !== null &&
            candidate.monthlyPricePerSeat > 0,
        )
        .sort((a, b) => (a.monthlyPricePerSeat ?? Number.POSITIVE_INFINITY) - (b.monthlyPricePerSeat ?? Number.POSITIVE_INFINITY))[0];

      if (!cheaperIndividualPlan || cheaperIndividualPlan.monthlyPricePerSeat === null) {
        continue;
      }

      const activeUsers = Math.max(1, Math.min(entry.seats, input.teamSize));
      const savings = roundCurrency((seatPrice - cheaperIndividualPlan.monthlyPricePerSeat) * activeUsers);

      let reasoning = `With a ${input.teamSize}-person team, ${plan.planName} at $${seatPrice}/seat is oversized. Moving to ${cheaperIndividualPlan.planName} at $${cheaperIndividualPlan.monthlyPricePerSeat}/user saves $${savings}/month.`;

      if (entry.toolId === 'chatgpt' && plan.planId === 'business' && cheaperIndividualPlan.planId === 'plus') {
        reasoning = `ChatGPT Business is $${seatPrice}/seat, while ChatGPT Plus is $${cheaperIndividualPlan.monthlyPricePerSeat}/user for individuals. Plus covers the same small-team use case and changes cost by $${savings}/month.`;
      }

      addCandidate(
        candidateMap,
        buildCandidate({
          ruleId: 'rule3_small_team',
          toolId: entry.toolId,
          currentPlanId: entry.planId,
          currentMonthlyCost: entry.monthlySpend,
          recommendedAction: 'downgrade',
          recommendedPlanId: cheaperIndividualPlan.planId,
          monthlySavings: savings,
          reasoning,
        }),
      );
    }
  }

  // Rule 4 — Redundancy detection across the whole stack.
  const hasCursor = entryByTool.has('cursor');
  const hasCopilot = entryByTool.has('github-copilot');
  const hasWindsurf = entryByTool.has('windsurf');
  const hasClaude = entryByTool.has('claude');
  const hasChatGPT = entryByTool.has('chatgpt');
  const hasGemini = entryByTool.has('gemini');
  const hasOpenAiApi = entryByTool.has('openai-api');

  if ((input.useCase === 'coding' || input.useCase === 'mixed') && hasCursor && hasCopilot) {
    const cursor = entryByTool.get('cursor')!;
    const copilot = entryByTool.get('github-copilot')!;
    const dropTool: ToolId = cursor.monthlySpend >= copilot.monthlySpend ? 'cursor' : 'github-copilot';
    const keepTool: ToolId = dropTool === 'cursor' ? 'github-copilot' : 'cursor';
    const dropEntry = entryByTool.get(dropTool)!;
    const savings = roundCurrency(Math.max(cursor.monthlySpend, copilot.monthlySpend));

    addCandidate(
      candidateMap,
      buildCandidate({
        ruleId: 'rule4_redundancy',
        toolId: dropTool,
        currentPlanId: dropEntry.planId,
        currentMonthlyCost: dropEntry.monthlySpend,
        recommendedAction: 'consolidate',
        recommendedToolId: keepTool,
        monthlySavings: savings,
        reasoning: `Cursor and GitHub Copilot overlap heavily for coding teams. Keep ${PRICING_DATA[keepTool].displayName} and remove ${PRICING_DATA[dropTool].displayName} to save $${savings}/month.`,
      }),
    );
  }

  if (hasCursor && hasWindsurf) {
    const cursor = entryByTool.get('cursor')!;
    const windsurf = entryByTool.get('windsurf')!;
    const dropTool: ToolId = cursor.monthlySpend >= windsurf.monthlySpend ? 'cursor' : 'windsurf';
    const keepTool = dropTool === 'cursor' ? 'windsurf' : 'cursor';
    const dropEntry = entryByTool.get(dropTool)!;
    const savings = roundCurrency(Math.max(cursor.monthlySpend, windsurf.monthlySpend));

    addCandidate(
      candidateMap,
      buildCandidate({
        ruleId: 'rule4_redundancy',
        toolId: dropTool,
        currentPlanId: dropEntry.planId,
        currentMonthlyCost: dropEntry.monthlySpend,
        recommendedAction: 'consolidate',
        recommendedToolId: keepTool,
        monthlySavings: savings,
        reasoning: `Cursor and Windsurf are direct competitors with overlapping capabilities. Keep ${PRICING_DATA[keepTool].displayName} and remove ${PRICING_DATA[dropTool].displayName} to save $${savings}/month.`,
      }),
    );
  }

  if ((input.useCase === 'writing' || input.useCase === 'mixed') && hasClaude && hasChatGPT && !hasGemini) {
    const claude = entryByTool.get('claude')!;
    const chatgpt = entryByTool.get('chatgpt')!;

    const dropTool: ToolId = claude.monthlySpend >= chatgpt.monthlySpend ? 'claude' : 'chatgpt';
    const keepTool = dropTool === 'claude' ? 'chatgpt' : 'claude';
    const dropEntry = entryByTool.get(dropTool)!;
    const savings = roundCurrency(Math.max(claude.monthlySpend, chatgpt.monthlySpend));

    addCandidate(
      candidateMap,
      buildCandidate({
        ruleId: 'rule4_redundancy',
        toolId: dropTool,
        currentPlanId: dropEntry.planId,
        currentMonthlyCost: dropEntry.monthlySpend,
        recommendedAction: 'consolidate',
        recommendedToolId: keepTool,
        monthlySavings: savings,
        reasoning: `For writing-focused teams, Claude and ChatGPT overlap heavily. Keep ${PRICING_DATA[keepTool].displayName} and remove ${PRICING_DATA[dropTool].displayName} to save $${savings}/month.`,
      }),
    );
  }

  if (hasClaude && hasChatGPT && hasGemini) {
    const claude = entryByTool.get('claude')!;
    const chatgpt = entryByTool.get('chatgpt')!;
    const gemini = entryByTool.get('gemini')!;
    const stacks: Array<{ toolId: ToolId; spend: number; planId: string }> = [
      { toolId: claude.toolId, spend: claude.monthlySpend, planId: claude.planId },
      { toolId: chatgpt.toolId, spend: chatgpt.monthlySpend, planId: chatgpt.planId },
      { toolId: gemini.toolId, spend: gemini.monthlySpend, planId: gemini.planId },
    ].sort((a, b) => a.spend - b.spend);

    const keepTool: ToolId =
      (input.useCase === 'writing' || input.useCase === 'mixed') && hasClaude
        ? 'claude'
        : stacks[0]?.toolId ?? 'claude';
    const removedTools = stacks.filter((item) => item.toolId !== keepTool).sort((a, b) => b.spend - a.spend);
    const combinedSavings = roundCurrency(removedTools.reduce((sum, item) => sum + item.spend, 0));

    for (const removed of removedTools) {
      addCandidate(
        candidateMap,
        buildCandidate({
          ruleId: 'rule4_redundancy',
          toolId: removed.toolId,
          currentPlanId: removed.planId,
          currentMonthlyCost: removed.spend,
          recommendedAction: 'consolidate',
          recommendedToolId: keepTool,
          monthlySavings: roundCurrency(removed.spend),
          reasoning:
            keepTool === 'claude' && (input.useCase === 'writing' || input.useCase === 'mixed')
              ? `Your team has three overlapping general AI tools. For a writing team Claude alone covers everything ChatGPT and Gemini provide. Removing ${PRICING_DATA[removed.toolId].displayName} contributes to $${combinedSavings}/month in total savings across the two removed tools.`
              : `Your team has three overlapping general AI tools. Keep ${PRICING_DATA[keepTool].displayName} and remove ${PRICING_DATA[removed.toolId].displayName}; together the two removed tools save $${combinedSavings}/month.`,
        }),
      );
    }
  }

  if (hasOpenAiApi && hasChatGPT && (input.useCase === 'coding' || input.useCase === 'data' || input.useCase === 'mixed')) {
    const chatgpt = entryByTool.get('chatgpt')!;

    if (chatgpt.planId === 'plus' || chatgpt.planId === 'pro') {
      addCandidate(
        candidateMap,
        buildCandidate({
          ruleId: 'rule4_redundancy',
          toolId: 'chatgpt',
          currentPlanId: chatgpt.planId,
          currentMonthlyCost: chatgpt.monthlySpend,
          recommendedAction: 'switch',
          recommendedToolId: 'openai-api',
          monthlySavings: roundCurrency(chatgpt.monthlySpend),
          reasoning: `You already pay for OpenAI API access; for technical teams it usually covers the same use case as ChatGPT ${chatgpt.planId}. Removing ChatGPT saves $${roundCurrency(chatgpt.monthlySpend)}/month.`,
        }),
      );
    }
  }

  // Rule 5 — Use case mismatch.
  if (input.useCase === 'writing' || input.useCase === 'research') {
    for (const codingTool of ['cursor', 'github-copilot'] as const) {
      const item = entryByTool.get(codingTool);
      if (!item) {
        continue;
      }

      addCandidate(
        candidateMap,
        buildCandidate({
          ruleId: 'rule5_use_case_mismatch',
          toolId: codingTool,
          currentPlanId: item.planId,
          currentMonthlyCost: item.monthlySpend,
          recommendedAction: 'switch',
          monthlySavings: roundCurrency(item.monthlySpend),
          reasoning: `${PRICING_DATA[codingTool].displayName} is a coding assistant. For a ${input.useCase}-focused team it provides no value, so removing it saves $${roundCurrency(item.monthlySpend)}/month.`,
        }),
      );
    }
  }

  if (input.useCase === 'coding' && input.tools.length === 1 && entryByTool.has('gemini')) {
    const gemini = entryByTool.get('gemini')!;

    addCandidate(
      candidateMap,
      buildCandidate({
        ruleId: 'rule5_use_case_mismatch',
        toolId: 'gemini',
        currentPlanId: gemini.planId,
        currentMonthlyCost: gemini.monthlySpend,
        recommendedAction: 'switch',
        recommendedToolId: 'cursor',
        monthlySavings: 0,
        reasoning: `Gemini is a general-purpose assistant. A coding team should add a dedicated coding tool like Cursor or GitHub Copilot for better developer output; current immediate savings estimate is $0/month.`,
      }),
    );
  }

  const recommendations: AuditRecommendation[] = [];
  const uniqueToolSavings = new Map<ToolId, number>();

  for (const entry of auditableEntries) {
    const toolCandidates = candidateMap.get(entry.toolId) ?? [];

    if (toolCandidates.length === 0) {
      const plan = planByTool.get(entry.toolId);
      recommendations.push({
        toolId: entry.toolId,
        currentPlanId: entry.planId,
        currentMonthlyCost: roundCurrency(entry.monthlySpend),
        recommendedAction: 'keep',
        monthlySavings: 0,
        annualSavings: 0,
        reasoning: getSingleToolKeepReason(entry, plan, input.useCase),
        credexRelevant: false,
      });
      uniqueToolSavings.set(entry.toolId, 0);
      continue;
    }

    const selectedCandidate = [...toolCandidates].sort((a, b) => {
      const priorityDiff = getRulePriority(a.ruleId) - getRulePriority(b.ruleId);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return b.monthlySavings - a.monthlySavings;
    })[0];

    const maxUniqueSavings = toolCandidates.reduce((max, candidate) => Math.max(max, candidate.monthlySavings), 0);
    uniqueToolSavings.set(entry.toolId, roundCurrency(maxUniqueSavings));

    recommendations.push({
      toolId: selectedCandidate.toolId,
      currentPlanId: selectedCandidate.currentPlanId,
      currentMonthlyCost: roundCurrency(selectedCandidate.currentMonthlyCost),
      recommendedAction: selectedCandidate.recommendedAction,
      recommendedPlanId: selectedCandidate.recommendedPlanId,
      recommendedToolId: selectedCandidate.recommendedToolId,
      monthlySavings: roundCurrency(selectedCandidate.monthlySavings),
      annualSavings: toAnnual(selectedCandidate.monthlySavings),
      reasoning: selectedCandidate.reasoning,
      credexRelevant: false,
    });
  }

  // Rule 6 — High spend per developer alert.
  const totalDeclaredSpend = roundCurrency(auditableEntries.reduce((sum, tool) => sum + tool.monthlySpend, 0));
  const spendPerDeveloper = input.teamSize > 0 ? roundCurrency(totalDeclaredSpend / input.teamSize) : totalDeclaredSpend;

  let stackLevelSavings = 0;
  if (input.teamSize > 0 && spendPerDeveloper > 150 && auditableEntries.length > 0) {
    stackLevelSavings = roundCurrency(totalDeclaredSpend * 0.2);

    const anchorTool = auditableEntries.reduce((top, current) =>
      current.monthlySpend > top.monthlySpend ? current : top,
    );

    recommendations.push({
      toolId: anchorTool.toolId,
      currentPlanId: anchorTool.planId,
      currentMonthlyCost: roundCurrency(anchorTool.monthlySpend),
      recommendedAction: 'switch',
      monthlySavings: stackLevelSavings,
      annualSavings: toAnnual(stackLevelSavings),
      reasoning: `Your team spends $${spendPerDeveloper} per developer per month on AI tools. Teams your size typically spend $80 to $120. Consider auditing usage across your stack; a conservative optimization target is $${stackLevelSavings}/month.`,
      credexRelevant: false,
    });
  }

  const uniqueSavingsFromTools = roundCurrency(
    [...uniqueToolSavings.values()].reduce((sum, value) => sum + value, 0),
  );
  const totalMonthlySavings = roundCurrency(uniqueSavingsFromTools + stackLevelSavings);
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
