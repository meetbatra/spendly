import type { Metadata } from 'next';
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
  downgrade: 'bg-amber-100 text-amber-800 border-amber-200',
  switch: 'bg-blue-100 text-blue-800 border-blue-200',
  consolidate: 'bg-orange-100 text-orange-800 border-orange-200',
  keep: 'bg-green-100 text-green-800 border-green-200',
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

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Audit Results</CardTitle>
            <CardDescription>Share ID: {audit.shareId}</CardDescription>
          </CardHeader>
          <CardContent>
            {audit.totalMonthlySavings > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-green-700">Monthly Savings</p>
                  <p className="mt-2 text-4xl font-semibold text-green-700">${audit.totalMonthlySavings}</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                  <p className="text-xs uppercase tracking-wide text-green-700">Annual Savings</p>
                  <p className="mt-2 text-4xl font-semibold text-green-700">${audit.totalAnnualSavings}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-green-800">
                <p className="text-lg font-medium">You&apos;re spending well.</p>
                <p className="mt-1 text-sm">No meaningful savings opportunities were identified in this audit.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Per-Tool Recommendations</CardTitle>
            <CardDescription>Detailed actions for each tool in your current stack.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {audit.recommendations.map((recommendation) => (
                <div key={`${recommendation.toolId}-${recommendation.currentPlanId}`} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">
                      {TOOL_NAME_BY_ID[recommendation.toolId] || recommendation.toolId}
                    </p>
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${ACTION_BADGE_CLASSES[recommendation.recommendedAction]}`}
                    >
                      {recommendation.recommendedAction}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Current plan: <span className="text-foreground">{recommendation.currentPlanId}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Current monthly cost: <span className="text-foreground">${recommendation.currentMonthlyCost}</span>
                  </p>
                  <p className="mt-2 text-sm font-medium text-green-700">
                    Monthly savings: ${recommendation.monthlySavings}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{recommendation.reasoning}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {audit.totalMonthlySavings > 500 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle>Credex Opportunity</CardTitle>
              <CardDescription>
                You are in a high-savings profile. Credex can reduce AI costs further by selling discounted AI credits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href="https://credex.rocks"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Explore Credex Credits
              </a>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>AI Summary</CardTitle>
            <CardDescription>Personalized summary of your current optimization opportunities.</CardDescription>
          </CardHeader>
          <CardContent>
            <SummaryClient auditPayload={auditPayload} initialSummary={audit.summary} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Get Follow-up</CardTitle>
            <CardDescription>
              Leave your details and we&apos;ll send your audit details plus next-step recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeadCaptureClient auditId={audit.shareId} teamSize={audit.teamSize} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
