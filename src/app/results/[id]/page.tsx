import type { Metadata } from 'next';
import { BarChart3, CheckCircle2, Download, Sparkles, TrendingDown } from 'lucide-react';
import { notFound } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { TOOLS } from '@/lib/tools';
import type { AuditRecommendation, AuditResult, ToolEntry, UseCase } from '@/types/audit';

import { LeadCaptureClient } from './lead-capture-client';
import { SpendProjectionChart, TopOpportunitiesChart } from './results-visual-charts';
import { SummaryClient } from './summary-client';

type ResultPageProps = {
  params: Promise<{ id: string }>;
};

interface StoredAudit {
  id: string;
  shareId: string;
  tools: ToolEntry[];
  recommendations: AuditRecommendation[];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  summary: string | null;
  useCase: UseCase;
  teamSize: number;
  savingsTier: 'none' | 'low' | 'medium' | 'high';
  createdAt: Date;
}

const ACTION_BADGE_CLASSES: Record<AuditRecommendation['recommendedAction'], string> = {
  downgrade: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  switch: 'bg-blue-500/10 text-[#007AFF] border-blue-500/20',
  consolidate: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  keep: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

const CARD_TINT_CLASSES: Record<AuditRecommendation['recommendedAction'], string> = {
  downgrade: 'border-amber-500/10 bg-amber-500/[0.02] hover:border-amber-500/30 hover:bg-amber-500/[0.05]',
  switch: 'border-blue-500/10 bg-blue-500/[0.02] hover:border-blue-500/30 hover:bg-blue-500/[0.05]',
  consolidate: 'border-orange-500/10 bg-orange-500/[0.02] hover:border-orange-500/30 hover:bg-orange-500/[0.05]',
  keep: 'border-emerald-500/10 bg-emerald-500/[0.02] hover:border-emerald-500/30 hover:bg-emerald-500/[0.05]',
};

const ACTION_SEGMENT_CLASSES: Record<AuditRecommendation['recommendedAction'], string> = {
  downgrade: 'bg-amber-500',
  switch: 'bg-blue-500',
  consolidate: 'bg-orange-500',
  keep: 'bg-emerald-500',
};

const TOOL_NAME_BY_ID = Object.fromEntries(
  TOOLS.map((tool) => [tool.toolId, tool.displayName]),
) as Record<string, string>;

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

async function findAudit(shareId: string): Promise<StoredAudit | null> {
  if (!prisma) {
    return null;
  }

  const audit = await prisma.audit.findUnique({
    where: { shareId },
  });

  if (!audit) {
    return null;
  }

  return {
    id: audit.id,
    shareId: audit.shareId,
    tools: audit.tools as unknown as ToolEntry[],
    recommendations: audit.auditResults as unknown as AuditRecommendation[],
    totalMonthlySavings: audit.totalMonthlySavings,
    totalAnnualSavings: audit.totalAnnualSavings,
    summary: audit.summary,
    useCase: audit.useCase as UseCase,
    teamSize: audit.teamSize,
    savingsTier: audit.savingsTier as 'none' | 'low' | 'medium' | 'high',
    createdAt: audit.createdAt,
  };
}

function buildAuditResultPayload(audit: StoredAudit): AuditResult {
  return {
    input: {
      tools: audit.tools,
      teamSize: audit.teamSize,
      useCase: audit.useCase,
    },
    recommendations: audit.recommendations,
    totalMonthlySavings: audit.totalMonthlySavings,
    totalAnnualSavings: audit.totalAnnualSavings,
    savingsTier: audit.savingsTier,
    generatedAt: audit.createdAt,
    shareId: audit.shareId,
    summary: audit.summary || undefined,
  };
}

export async function generateMetadata({ params }: ResultPageProps): Promise<Metadata> {
  const { id } = await params;
  const audit = await findAudit(id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const canonicalUrl = `${appUrl}/results/${id}`;

  if (!audit) {
    return {
      title: 'Spendly Audit Result',
      description: 'Spendly audit results page.',
      openGraph: {
        title: 'Spendly Audit Result',
        description: 'Spendly audit results page.',
        url: canonicalUrl,
      },
    };
  }

  const topRecommendation = [...audit.recommendations].sort(
    (a, b) => b.monthlySavings - a.monthlySavings,
  )[0];

  const title = `I could save $${audit.totalMonthlySavings}/month on AI tools — Spendly`;
  const description = topRecommendation
    ? `Top recommendation: ${TOOL_NAME_BY_ID[topRecommendation.toolId] || topRecommendation.toolId} via ${topRecommendation.recommendedAction}, saving about $${topRecommendation.monthlySavings}/month.`
    : `Potential savings identified: $${audit.totalMonthlySavings}/month.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
    },
  };
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { id } = await params;
  const audit = await findAudit(id);

  if (!audit) {
    notFound();
  }

  const auditPayload = buildAuditResultPayload(audit);
  const hasRecommendations = audit.recommendations.length > 0;
  const singleSelectedTool = audit.tools.length === 1 ? audit.tools[0] : null;
  const singleToolName = singleSelectedTool
    ? TOOL_NAME_BY_ID[singleSelectedTool.toolId] || singleSelectedTool.toolId
    : null;
  const currentMonthlySpend = Number(
    audit.tools.reduce((sum, tool) => sum + tool.monthlySpend, 0).toFixed(2),
  );
  const projectedMonthlySpend = Math.max(
    0,
    Number((currentMonthlySpend - audit.totalMonthlySavings).toFixed(2)),
  );
  const savingsRecoveryRate =
    currentMonthlySpend > 0
      ? Number(((audit.totalMonthlySavings / currentMonthlySpend) * 100).toFixed(1))
      : 0;

  const recommendationsBySavings = [...audit.recommendations].sort(
    (a, b) => b.monthlySavings - a.monthlySavings,
  );
  const recommendationsWithSavings = recommendationsBySavings.filter(
    (item) => item.monthlySavings > 0,
  );
  const topThreeOpportunities = recommendationsWithSavings.slice(0, 3);
  const maxToolSavings =
    recommendationsWithSavings.length > 0
      ? Math.max(...recommendationsWithSavings.map((item) => item.monthlySavings))
      : 0;

  const actionCounts = audit.recommendations.reduce<Record<AuditRecommendation['recommendedAction'], number>>(
    (acc, recommendation) => {
      acc[recommendation.recommendedAction] += 1;
      return acc;
    },
    {
      downgrade: 0,
      switch: 0,
      consolidate: 0,
      keep: 0,
    },
  );
  const actionTotal = audit.recommendations.length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pt-[100px] pb-20 px-4">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(150,150,150,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(150,150,150,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#007AFF] rounded-full blur-[150px] opacity-[0.05] pointer-events-none"></div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 relative z-10">
        <div className="space-y-3 text-center mb-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Audit Results</h1>
          <div className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Share ID:{' '}
              <span className="font-mono bg-background/50 px-2 py-1 rounded border border-border-subtle">
                {audit.shareId}
              </span>
            </p>
            <a
              href={`/api/report/${audit.shareId}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border-subtle bg-background/60 px-5 text-sm font-semibold text-foreground transition hover:border-[#007AFF]/60 hover:text-[#007AFF]"
            >
              <Download className="size-4" />
              Download PDF Report
            </a>
          </div>
        </div>

        <div className="grid items-stretch gap-6 xl:grid-cols-12">
          <Card className="h-full border-border-subtle bg-surface-dim/50 backdrop-blur-md shadow-xl overflow-hidden xl:col-span-8">
            <CardContent className="h-full p-6 md:p-8">
              {audit.totalMonthlySavings > 0 ? (
                <div className="h-full space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border-subtle bg-background/40 p-6 relative overflow-hidden group hover:border-[#007AFF]/50 transition-colors">
                      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,122,255,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                        Potential Monthly Savings
                      </p>
                      <p className="text-5xl font-bold text-foreground tracking-tight">
                        ${formatUsd(audit.totalMonthlySavings)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border-subtle bg-background/40 p-6 relative overflow-hidden group hover:border-[#007AFF]/50 transition-colors">
                      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,122,255,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                        Potential Annual Savings
                      </p>
                      <p className="text-5xl font-bold text-foreground tracking-tight">
                        ${formatUsd(audit.totalAnnualSavings)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border-subtle bg-background/40 p-5">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                        Spend Projection
                      </p>
                      <SpendProjectionChart
                        currentMonthlySpend={currentMonthlySpend}
                        projectedMonthlySpend={projectedMonthlySpend}
                      />
                    </div>

                    <div className="rounded-xl border border-border-subtle bg-background/40 p-5">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                        Recovery Rate
                      </p>
                      <p className="text-4xl font-bold text-foreground">
                        {formatUsd(savingsRecoveryRate)}%
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Of your current AI spend could be recovered if recommendations are executed.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border-subtle bg-background/40 p-6 relative overflow-hidden">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-6 text-emerald-500" />
                    <div>
                      <p className="text-xl font-semibold text-foreground">Your stack looks good</p>
                      <p className="mt-2 text-muted-foreground">
                        No major savings opportunities found with your current setup. Full breakdown is below.
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        As your team grows come back for a re-audit — opportunities change with team size and tool
                        usage.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="h-full border-border-subtle bg-surface-dim/50 backdrop-blur-md shadow-xl overflow-hidden xl:col-span-4">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="size-5 text-[#007AFF]" />
                AI Summary
              </CardTitle>
              <CardDescription>
                Personalized summary of your current optimization opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <SummaryClient auditPayload={auditPayload} initialSummary={audit.summary} />
            </CardContent>
          </Card>
        </div>

        <Card className="border-border-subtle bg-surface-dim/50 backdrop-blur-md shadow-xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-0">
            <CardTitle className="text-2xl">Per-Tool Recommendations</CardTitle>
            <CardDescription className="text-base mt-2">
              Detailed actions for each tool in your current stack.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {hasRecommendations ? (
              <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-2">
                {audit.recommendations.map((recommendation) => (
                  <div
                    key={`${recommendation.toolId}-${recommendation.currentPlanId}-${recommendation.recommendedAction}`}
                    className={`rounded-xl border p-5 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${CARD_TINT_CLASSES[recommendation.recommendedAction]}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <p className="font-bold text-foreground text-lg">
                        {TOOL_NAME_BY_ID[recommendation.toolId] || recommendation.toolId}
                      </p>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${ACTION_BADGE_CLASSES[recommendation.recommendedAction]}`}
                      >
                        {recommendation.recommendedAction.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current plan:</span>
                        <span className="font-medium text-foreground">{recommendation.currentPlanId}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current cost:</span>
                        <span className="font-medium text-foreground">
                          ${formatUsd(recommendation.currentMonthlyCost)}/mo
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border-subtle">
                      <p className="text-sm font-semibold text-emerald-500 mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">trending_down</span> Savings: $
                        {formatUsd(recommendation.monthlySavings)}/mo
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{recommendation.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
                <p className="font-semibold text-foreground">
                  {singleToolName
                    ? `${singleToolName} looks correctly configured.`
                    : 'No per-tool action needed right now.'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {singleToolName
                    ? `This audit has one selected tool and no billable optimization signals, so there is no per-tool recommendation to show. Add paid tools or higher-seat plans to surface actionable savings opportunities.`
                    : 'Your current inputs did not trigger billable optimization rules. As your team size or paid tool mix changes, rerun the audit for updated recommendations.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          <Card className="h-full border-border-subtle bg-surface-dim/50 backdrop-blur-md shadow-xl overflow-hidden">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="text-xl flex items-center gap-2">
                <BarChart3 className="size-5 text-[#007AFF]" />
                Savings by Tool
              </CardTitle>
              <CardDescription>
                Potential monthly savings distributed across your stack.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {recommendationsWithSavings.length > 0 ? (
                recommendationsWithSavings.slice(0, 6).map((recommendation) => {
                  const widthPct =
                    maxToolSavings > 0
                      ? Math.max(6, (recommendation.monthlySavings / maxToolSavings) * 100)
                      : 0;
                  return (
                    <div key={`${recommendation.toolId}-${recommendation.recommendedAction}`}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">
                          {TOOL_NAME_BY_ID[recommendation.toolId] || recommendation.toolId}
                        </span>
                        <span className="text-emerald-500 font-semibold">
                          ${formatUsd(recommendation.monthlySavings)}/mo
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#007AFF]"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  No savings bars to display yet because no tool has positive projected savings.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="h-full border-border-subtle bg-surface-dim/50 backdrop-blur-md shadow-xl overflow-hidden">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingDown className="size-5 text-[#007AFF]" />
                Top Opportunities
              </CardTitle>
              <CardDescription>
                Highest-impact actions ranked by projected monthly savings.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {topThreeOpportunities.length > 0 ? (
                <div className="space-y-4">
                  <TopOpportunitiesChart
                    opportunities={topThreeOpportunities.map((recommendation) => ({
                      toolName:
                        TOOL_NAME_BY_ID[recommendation.toolId] || recommendation.toolId,
                      monthlySavings: recommendation.monthlySavings,
                    }))}
                  />
                  <div className="space-y-3">
                    {topThreeOpportunities.map((recommendation, index) => (
                      <div key={`top-${recommendation.toolId}`} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">
                          {index + 1}. {TOOL_NAME_BY_ID[recommendation.toolId] || recommendation.toolId}
                        </span>
                        <span className="text-emerald-500 font-semibold">
                          ${formatUsd(recommendation.monthlySavings)}/mo
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No high-impact opportunities yet. Add paid tools or higher usage to generate trends.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="h-full border-border-subtle bg-surface-dim/50 backdrop-blur-md shadow-xl overflow-hidden">
            <CardHeader className="p-6 pb-0">
              <CardTitle className="text-xl">Action Mix</CardTitle>
              <CardDescription>Breakdown of recommendation types in this audit.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
                {actionTotal > 0 ? (
                  <div className="flex h-full w-full">
                    {(
                      ['downgrade', 'switch', 'consolidate', 'keep'] as Array<
                        AuditRecommendation['recommendedAction']
                      >
                    ).map((action) => {
                      const count = actionCounts[action];
                      const widthPct = actionTotal > 0 ? (count / actionTotal) * 100 : 0;
                      return count > 0 ? (
                        <div
                          key={`segment-${action}`}
                          className={ACTION_SEGMENT_CLASSES[action]}
                          style={{ width: `${widthPct}%` }}
                        />
                      ) : null;
                    })}
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {(
                  ['downgrade', 'switch', 'consolidate', 'keep'] as Array<
                    AuditRecommendation['recommendedAction']
                  >
                ).map((action) => (
                  <div key={`count-${action}`} className="rounded-lg border border-border-subtle bg-background/40 px-3 py-2">
                    <p className="capitalize text-muted-foreground">{action}</p>
                    <p className="text-lg font-semibold text-foreground">{actionCounts[action]}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {audit.totalMonthlySavings > 500 && (
          <Card className="border-[#007AFF]/30 bg-[#007AFF]/5 backdrop-blur-md shadow-[0_0_30px_rgba(0,122,255,0.1)] overflow-hidden relative">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,122,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[gradient_3s_linear_infinite]"></div>
            <CardHeader className="p-6 pb-0 relative z-10">
              <CardTitle className="text-xl text-[#007AFF] flex items-center gap-2">
                <span className="material-symbols-outlined">diamond</span> Credex Opportunity
              </CardTitle>
              <CardDescription className="text-base mt-2">
                You are in a high-savings profile. Credex can reduce AI costs further by selling discounted AI
                credits.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 relative z-10">
              <a
                href="https://credex.rocks"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#007AFF] px-6 text-sm font-semibold text-white transition hover:bg-blue-600 shadow-[0_0_15px_rgba(0,122,255,0.3)] gap-2 group"
              >
                Explore Credex Credits{' '}
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </a>
            </CardContent>
          </Card>
        )}

        <div className="py-3 flex flex-wrap items-start justify-center gap-3">
          <LeadCaptureClient auditId={audit.shareId} teamSize={audit.teamSize} />
        </div>
      </div>
    </div>
  );
}
