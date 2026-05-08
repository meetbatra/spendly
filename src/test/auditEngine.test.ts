import { describe, expect, it } from 'vitest';

import { runAudit } from '@/lib/auditEngine';
import type { AuditInput, ToolEntry, ToolId, UseCase } from '@/types/audit';

function entry(toolId: ToolId, planId: string, monthlySpend: number, seats: number): ToolEntry {
  return {
    toolId,
    planId,
    monthlySpend,
    seats,
  };
}

function input(tools: ToolEntry[], teamSize: number, useCase: UseCase): AuditInput {
  return {
    tools,
    teamSize,
    useCase,
  };
}

function recommendationFor(result: ReturnType<typeof runAudit>, toolId: ToolId) {
  const recommendation = result.recommendations.find((item) => item.toolId === toolId);
  expect(recommendation).toBeDefined();
  return recommendation!;
}

describe('runAudit', () => {
  it('flags team of 2 on Cursor Business to downgrade to Pro with correct savings', () => {
    const result = runAudit(input([entry('cursor', 'business', 80, 2)], 2, 'coding'));

    const recommendation = recommendationFor(result, 'cursor');
    expect(recommendation.recommendedAction).toBe('downgrade');
    expect(recommendation.recommendedPlanId).toBe('pro');
    expect(recommendation.monthlySavings).toBe(40);
    expect(recommendation.annualSavings).toBe(480);
  });

  it('flags consolidation when both Cursor and GitHub Copilot are present for coding use case', () => {
    const result = runAudit(
      input(
        [entry('cursor', 'business', 200, 5), entry('github-copilot', 'pro', 50, 5)],
        5,
        'coding',
      ),
    );

    const copilotRecommendation = recommendationFor(result, 'github-copilot');
    expect(copilotRecommendation.recommendedAction).toBe('consolidate');
    expect(copilotRecommendation.recommendedToolId).toBe('cursor');
    expect(copilotRecommendation.monthlySavings).toBe(50);
  });

  it('flags redundancy when both Claude and ChatGPT Plus are present for writing use case', () => {
    const result = runAudit(
      input([entry('claude', 'pro', 20, 1), entry('chatgpt', 'plus', 20, 1)], 4, 'writing'),
    );

    const chatgptRecommendation = recommendationFor(result, 'chatgpt');
    expect(chatgptRecommendation.recommendedAction).toBe('consolidate');
    expect(chatgptRecommendation.recommendedToolId).toBe('claude');
    expect(chatgptRecommendation.monthlySavings).toBe(20);
  });

  it('detects seat waste when declared seats exceed team size', () => {
    const result = runAudit(input([entry('cursor', 'business', 400, 10)], 4, 'coding'));

    const recommendation = recommendationFor(result, 'cursor');
    expect(recommendation.recommendedAction).toBe('downgrade');
    expect(recommendation.monthlySavings).toBe(240);
    expect(recommendation.reasoning).toContain('unused');
  });

  it('calculates savingsTier correctly for none, low, medium, and high', () => {
    const noneResult = runAudit(input([entry('cursor', 'pro', 20, 1)], 5, 'coding'));
    expect(noneResult.totalMonthlySavings).toBe(0);
    expect(noneResult.savingsTier).toBe('none');

    const lowResult = runAudit(input([entry('chatgpt', 'business', 120, 6)], 1, 'writing'));
    expect(lowResult.totalMonthlySavings).toBe(100);
    expect(lowResult.savingsTier).toBe('low');

    const mediumResult = runAudit(input([entry('windsurf', 'teams', 360, 12)], 1, 'coding'));
    expect(mediumResult.totalMonthlySavings).toBe(330);
    expect(mediumResult.savingsTier).toBe('medium');

    const highResult = runAudit(input([entry('cursor', 'business', 640, 16)], 1, 'coding'));
    expect(highResult.totalMonthlySavings).toBe(600);
    expect(highResult.savingsTier).toBe('high');
  });

  it('returns keep for all tools and zero total savings for a well-optimized stack', () => {
    const result = runAudit(
      input([entry('cursor', 'pro', 80, 4), entry('github-copilot', 'business', 76, 4)], 4, 'research'),
    );

    expect(result.totalMonthlySavings).toBe(0);
    expect(result.totalAnnualSavings).toBe(0);
    expect(result.recommendations.every((recommendation) => recommendation.recommendedAction === 'keep')).toBe(
      true,
    );
  });

  it('sets credexRelevant only when total monthly savings is over $500 and recommendation has positive savings', () => {
    const highResult = runAudit(
      input([entry('cursor', 'business', 640, 16), entry('claude', 'pro', 20, 1)], 1, 'data'),
    );

    const cursorRecommendation = recommendationFor(highResult, 'cursor');
    const claudeRecommendation = recommendationFor(highResult, 'claude');
    expect(highResult.totalMonthlySavings).toBeGreaterThan(500);
    expect(cursorRecommendation.credexRelevant).toBe(true);
    expect(claudeRecommendation.credexRelevant).toBe(false);

    const lowResult = runAudit(input([entry('cursor', 'business', 120, 3)], 1, 'coding'));
    const lowRecommendation = recommendationFor(lowResult, 'cursor');
    expect(lowResult.totalMonthlySavings).toBeLessThanOrEqual(500);
    expect(lowRecommendation.credexRelevant).toBe(false);
  });

  it('always returns a non-empty shareId and a valid generatedAt Date', () => {
    const result = runAudit(input([entry('openai-api', 'usage-based', 12, 1)], 1, 'data'));

    expect(typeof result.shareId).toBe('string');
    expect(result.shareId.length).toBeGreaterThan(0);
    expect(result.shareId.length).toBe(10);
    expect(result.generatedAt).toBeInstanceOf(Date);
    expect(Number.isNaN(result.generatedAt.getTime())).toBe(false);
  });
});
