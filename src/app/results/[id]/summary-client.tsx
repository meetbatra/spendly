'use client';

import { useEffect, useState } from 'react';

import type { AuditResult } from '@/types/audit';

interface SummaryClientProps {
  auditPayload: AuditResult;
  initialSummary: string | null;
}

export function SummaryClient({ auditPayload, initialSummary }: SummaryClientProps) {
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [loading, setLoading] = useState(!initialSummary);

  useEffect(() => {
    if (initialSummary) {
      return;
    }

    let active = true;

    const run = async () => {
      try {
        const response = await fetch('/api/summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(auditPayload),
        });

        const data = (await response.json()) as { summary?: string };

        if (active && data.summary) {
          setSummary(data.summary);
        }
      } catch {
        if (active) {
          setSummary(
            `Your audit for a ${auditPayload.input.teamSize}-person ${auditPayload.input.useCase} team shows $${auditPayload.totalMonthlySavings}/month in potential savings. Prioritize the highest-savings recommendations first and revisit tool allocation as usage evolves.`,
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [auditPayload, initialSummary]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground animate-pulse">
        <span className="material-symbols-outlined text-[#007AFF] animate-spin" style={{ animationDuration: '3s' }}>sync</span>
        <p className="text-base font-medium">Synthesizing optimization insights...</p>
      </div>
    );
  }

  return (
    <div className="prose prose-invert max-w-none">
      <p className="text-base leading-relaxed text-foreground/90 font-medium">{summary}</p>
    </div>
  );
}
