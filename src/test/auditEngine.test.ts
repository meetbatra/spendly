import { describe, expect, it } from 'vitest';

import { runAudit } from '@/lib/auditEngine';
import type { AuditInput, AuditRecommendation, ToolEntry, ToolId, UseCase } from '@/types/audit';

function entry(toolId: ToolId, planId: string, monthlySpend: number, seats: number): ToolEntry {
  return { toolId, planId, monthlySpend, seats };
}

function input(tools: ToolEntry[], teamSize: number, useCase: UseCase): AuditInput {
  return { tools, teamSize, useCase };
}

function findRecommendation(
  result: ReturnType<typeof runAudit>,
  predicate: (recommendation: AuditRecommendation) => boolean,
): AuditRecommendation {
  const recommendation = result.recommendations.find(predicate);
  expect(recommendation).toBeDefined();
  return recommendation!;
}

describe('runAudit v2', () => {
  it('detects declared spend mismatch when spend is over 20% above expected plan cost', () => {
    const result = runAudit(input([entry('cursor', 'pro', 40, 1)], 1, 'coding'));

    const recommendation = findRecommendation(result, (item) => item.toolId === 'cursor');
    expect(recommendation.recommendedAction).toBe('switch');
    expect(recommendation.monthlySavings).toBe(20);
    expect(recommendation.reasoning).toContain('You declared $40/month');
  });

  it('detects seat waste on per-seat plans using wasted seats * seat price', () => {
    const result = runAudit(input([entry('cursor', 'business', 240, 6)], 3, 'coding'));

    const recommendation = findRecommendation(result, (item) => item.toolId === 'cursor');
    expect(recommendation.recommendedAction).toBe('downgrade');
    expect(recommendation.monthlySavings).toBe(120);
    expect(recommendation.reasoning).toContain('3 seat(s) are unused');
    expect(recommendation.reasoning).toContain('$40/seat');
  });

  it('flags small team on team plan and recommends cheaper individual plan', () => {
    const result = runAudit(input([entry('cursor', 'business', 80, 2)], 2, 'coding'));

    const recommendation = findRecommendation(result, (item) => item.toolId === 'cursor');
    expect(recommendation.recommendedAction).toBe('downgrade');
    expect(recommendation.recommendedPlanId).toBe('pro');
    expect(recommendation.monthlySavings).toBe(40);
  });

  it('removes the more expensive tool for Cursor plus GitHub Copilot redundancy (Cursor expensive)', () => {
    const result = runAudit(
      input([entry('cursor', 'pro', 110, 5), entry('github-copilot', 'business', 95, 5)], 5, 'coding'),
    );

    const recommendation = findRecommendation(
      result,
      (item) => item.toolId === 'cursor' && item.recommendedAction === 'consolidate',
    );
    expect(recommendation.recommendedToolId).toBe('github-copilot');
    expect(recommendation.monthlySavings).toBe(110);
  });

  it('removes the more expensive tool for Cursor plus GitHub Copilot redundancy (Copilot expensive)', () => {
    const result = runAudit(
      input([entry('cursor', 'pro', 100, 5), entry('github-copilot', 'business', 110, 5)], 5, 'coding'),
    );

    const recommendation = findRecommendation(
      result,
      (item) => item.toolId === 'github-copilot' && item.recommendedAction === 'consolidate',
    );
    expect(recommendation.recommendedToolId).toBe('cursor');
    expect(recommendation.monthlySavings).toBe(110);
  });

  it('removes the more expensive tool for Cursor plus Windsurf redundancy', () => {
    const result = runAudit(
      input([entry('cursor', 'pro', 70, 3), entry('windsurf', 'pro', 45, 3)], 3, 'coding'),
    );

    const recommendation = findRecommendation(
      result,
      (item) => item.toolId === 'cursor' && item.recommendedAction === 'consolidate',
    );
    expect(recommendation.recommendedToolId).toBe('windsurf');
    expect(recommendation.monthlySavings).toBe(70);
  });

  it('removes the more expensive tool for Claude plus ChatGPT two-way redundancy', () => {
    const result = runAudit(
      input([entry('claude', 'pro', 120, 5), entry('chatgpt', 'plus', 100, 5)], 5, 'writing'),
    );

    const recommendation = findRecommendation(
      result,
      (item) => item.toolId === 'claude' && item.recommendedAction === 'consolidate',
    );
    expect(recommendation.recommendedToolId).toBe('chatgpt');
    expect(recommendation.monthlySavings).toBe(120);
  });

  it('triple redundancy removes two tools and keeps one', () => {
    const result = runAudit(
      input(
        [entry('claude', 'pro', 60, 5), entry('chatgpt', 'plus', 80, 5), entry('gemini', 'one-ai-pro', 70, 5)],
        5,
        'mixed',
      ),
    );

    const chatgptRecommendation = findRecommendation(result, (item) => item.toolId === 'chatgpt');
    const geminiRecommendation = findRecommendation(result, (item) => item.toolId === 'gemini');
    const claudeRecommendation = findRecommendation(result, (item) => item.toolId === 'claude');

    expect(chatgptRecommendation.recommendedAction).toBe('consolidate');
    expect(geminiRecommendation.recommendedAction).toBe('consolidate');
    expect(chatgptRecommendation.recommendedToolId).toBe('claude');
    expect(geminiRecommendation.recommendedToolId).toBe('claude');
    expect(claudeRecommendation.recommendedAction).toBe('keep');
    expect(result.totalMonthlySavings).toBe(150);
  });

  it('in writing use case triple redundancy keeps Claude when Claude is present', () => {
    const result = runAudit(
      input(
        [
          entry('claude', 'pro', 110, 5),
          entry('chatgpt', 'plus', 100, 5),
          entry('gemini', 'one-ai-pro', 90, 5),
        ],
        5,
        'writing',
      ),
    );

    const recommendation = findRecommendation(result, (item) => item.toolId === 'chatgpt');
    expect(recommendation.recommendedAction).toBe('consolidate');
    expect(recommendation.recommendedToolId).toBe('claude');
    expect(recommendation.reasoning).toContain('For a writing team Claude alone covers everything ChatGPT and Gemini provide');
  });

  it('flags use-case mismatch when writing team pays for Cursor', () => {
    const result = runAudit(input([entry('cursor', 'pro', 20, 1)], 1, 'writing'));

    const recommendation = findRecommendation(result, (item) => item.toolId === 'cursor');
    expect(recommendation.recommendedAction).toBe('switch');
    expect(recommendation.monthlySavings).toBe(20);
    expect(recommendation.reasoning).toContain('coding assistant');
  });

  it('adds high spend per developer stack alert with 20% savings estimate', () => {
    const result = runAudit(
      input([entry('chatgpt', 'pro', 200, 1), entry('claude', 'max', 100, 1)], 1, 'coding'),
    );

    const recommendation = findRecommendation(result, (item) => item.reasoning.includes('per developer'));
    expect(recommendation.monthlySavings).toBe(60);
    expect(recommendation.recommendedAction).toBe('switch');
  });

  it('calculates savingsTier as none, low, medium, and high', () => {
    const none = runAudit(input([entry('claude', 'pro', 20, 1)], 5, 'writing'));
    expect(none.totalMonthlySavings).toBe(0);
    expect(none.savingsTier).toBe('none');

    const low = runAudit(input([entry('chatgpt', 'plus', 120, 1)], 10, 'writing'));
    expect(low.totalMonthlySavings).toBe(100);
    expect(low.savingsTier).toBe('low');

    const medium = runAudit(input([entry('chatgpt', 'plus', 400, 1)], 10, 'writing'));
    expect(medium.totalMonthlySavings).toBe(380);
    expect(medium.savingsTier).toBe('medium');

    const high = runAudit(input([entry('chatgpt', 'plus', 700, 1)], 10, 'writing'));
    expect(high.totalMonthlySavings).toBe(680);
    expect(high.savingsTier).toBe('high');
  });

  it('gates credexRelevant by total savings > $500 and recommendation savings > 0', () => {
    const result = runAudit(
      input([entry('chatgpt', 'plus', 700, 1), entry('claude', 'pro', 20, 1)], 10, 'data'),
    );

    const chatgptRecommendation = findRecommendation(result, (item) => item.toolId === 'chatgpt');
    const claudeRecommendation = findRecommendation(result, (item) => item.toolId === 'claude');

    expect(result.totalMonthlySavings).toBeGreaterThan(500);
    expect(chatgptRecommendation.credexRelevant).toBe(true);
    expect(claudeRecommendation.credexRelevant).toBe(false);
  });

  it('returns keep only when no optimization rule matches the tool', () => {
    const result = runAudit(input([entry('claude', 'pro', 20, 1)], 5, 'writing'));

    expect(result.totalMonthlySavings).toBe(0);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]?.recommendedAction).toBe('keep');
    expect(result.recommendations[0]?.reasoning).toContain('Claude Pro at $20/month');
  });

  it('flags OpenAI API plus ChatGPT subscription overlap for technical teams', () => {
    const result = runAudit(
      input([entry('openai-api', 'usage-based', 30, 1), entry('chatgpt', 'plus', 20, 1)], 2, 'coding'),
    );

    const recommendation = findRecommendation(
      result,
      (item) => item.toolId === 'chatgpt' && item.recommendedToolId === 'openai-api',
    );

    expect(recommendation.recommendedAction).toBe('switch');
    expect(recommendation.monthlySavings).toBe(20);
  });

  it('generates share ids and valid generatedAt timestamp', () => {
    const result = runAudit(input([entry('claude', 'pro', 20, 1)], 1, 'writing'));

    expect(result.shareId).toHaveLength(10);
    expect(result.generatedAt).toBeInstanceOf(Date);
    expect(Number.isNaN(result.generatedAt.getTime())).toBe(false);
  });
});
