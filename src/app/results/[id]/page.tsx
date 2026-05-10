import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { notFound } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { TOOLS } from '@/lib/tools';
import type { AuditRecommendation, AuditResult, ToolEntry, UseCase } from '@/types/audit';

import { LeadCaptureClient } from './lead-capture-client';
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

const TOOL_NAME_BY_ID = Object.fromEntries(
  TOOLS.map((tool) => [tool.toolId, tool.displayName]),
) as Record<string, string>;

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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pt-[100px] pb-20 px-4">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(150,150,150,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(150,150,150,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#007AFF] rounded-full blur-[150px] opacity-[0.05] pointer-events-none"></div>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 relative z-10">
        <div className="space-y-3 text-center mb-6">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Audit Results</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Share ID: <span className="font-mono bg-background/50 px-2 py-1 rounded border border-border-subtle">{audit.shareId}</span>
          </p>
        </div>

        <Card className="border-border-subtle bg-surface-dim/50 backdrop-blur-md shadow-xl overflow-hidden">
          <CardContent className="p-6 md:p-8">
            {audit.totalMonthlySavings > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border-subtle bg-background/40 p-6 relative overflow-hidden group hover:border-[#007AFF]/50 transition-colors">
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,122,255,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Monthly Savings</p>
                  <p className="text-5xl font-bold text-foreground tracking-tight">${audit.totalMonthlySavings}</p>
                </div>
                <div className="rounded-xl border border-border-subtle bg-background/40 p-6 relative overflow-hidden group hover:border-[#007AFF]/50 transition-colors">
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,122,255,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Annual Savings</p>
                  <p className="text-5xl font-bold text-foreground tracking-tight">${audit.totalAnnualSavings}</p>
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

        <Card className="border-border-subtle bg-surface-dim/50 backdrop-blur-md shadow-xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-0">
            <CardTitle className="text-2xl">Per-Tool Recommendations</CardTitle>
            <CardDescription className="text-base mt-2">Detailed actions for each tool in your current stack.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {hasRecommendations ? (
              <div className="grid gap-4 md:grid-cols-2">
                {audit.recommendations.map((recommendation) => (
                  <div key={`${recommendation.toolId}-${recommendation.currentPlanId}`} className={`rounded-xl border p-5 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 ${CARD_TINT_CLASSES[recommendation.recommendedAction]}`}>
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
                        <span className="font-medium text-foreground">${recommendation.currentMonthlyCost}/mo</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border-subtle">
                      <p className="text-sm font-semibold text-emerald-500 mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">trending_down</span> Savings: ${recommendation.monthlySavings}/mo
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{recommendation.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
                <p className="font-semibold text-foreground">
                  {singleToolName ? `${singleToolName} looks correctly configured.` : 'No per-tool action needed right now.'}
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

        {audit.totalMonthlySavings > 500 && (
          <Card className="border-[#007AFF]/30 bg-[#007AFF]/5 backdrop-blur-md shadow-[0_0_30px_rgba(0,122,255,0.1)] overflow-hidden relative">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,122,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[gradient_3s_linear_infinite]"></div>
            <CardHeader className="p-6 md:p-8 pb-0 relative z-10">
              <CardTitle className="text-2xl text-[#007AFF] flex items-center gap-2">
                <span className="material-symbols-outlined">diamond</span> Credex Opportunity
              </CardTitle>
              <CardDescription className="text-base mt-2">
                You are in a high-savings profile. Credex can reduce AI costs further by selling discounted AI credits.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-8 relative z-10">
              <a
                href="https://credex.rocks"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#007AFF] px-8 text-sm font-semibold text-white transition hover:bg-blue-600 shadow-[0_0_15px_rgba(0,122,255,0.3)] gap-2 group"
              >
                Explore Credex Credits <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </a>
            </CardContent>
          </Card>
        )}

        <Card className="border-border-subtle bg-surface-dim/50 backdrop-blur-md shadow-xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 pb-0">
            <CardTitle className="text-2xl flex items-center gap-2">
               <span className="material-symbols-outlined text-[#007AFF]">auto_awesome</span> AI Summary
            </CardTitle>
            <CardDescription className="text-base mt-2">Personalized summary of your current optimization opportunities.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <SummaryClient auditPayload={auditPayload} initialSummary={audit.summary} />
          </CardContent>
        </Card>

        <Card className="border-border-subtle bg-surface-dim/50 backdrop-blur-md shadow-xl overflow-hidden mb-12">
          <CardHeader className="p-6 md:p-8 pb-0">
            <CardTitle className="text-2xl">Get Follow-up</CardTitle>
            <CardDescription className="text-base mt-2">
              Leave your details and we&apos;ll send your audit details plus next-step recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <LeadCaptureClient auditId={audit.shareId} teamSize={audit.teamSize} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
