'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { runAudit } from '@/lib/auditEngine';
import { PRICING_DATA } from '@/lib/pricingData';
import { TOOLS } from '@/lib/tools';
import { cn } from '@/lib/utils';
import { useAuditStore } from '@/store/auditStore';
import type { ToolId, UseCase } from '@/types/audit';

const USE_CASE_OPTIONS = ['coding', 'writing', 'data', 'research', 'mixed'] as const;
const TOOL_IDS = [
  'cursor',
  'github-copilot',
  'claude',
  'chatgpt',
  'openai-api',
  'anthropic-api',
  'gemini',
  'windsurf',
] as const satisfies readonly ToolId[];

const TEAM_CONTEXT_SCHEMA = z.object({
  teamSize: z.number().min(1, 'Team size must be at least 1.'),
  useCase: z.enum(USE_CASE_OPTIONS, {
    message: 'Please select a use case.',
  }),
});

const TOOL_SELECTION_SCHEMA = z.object({
  selectedTools: z
    .array(z.enum(TOOL_IDS))
    .min(1, 'Select at least one tool to continue.'),
});

const TOOL_ENTRY_SCHEMA = z.object({
  planId: z.string().min(1, 'Plan is required.'),
  seats: z.number().min(1, 'Seats must be at least 1.'),
  monthlySpend: z.number().min(0.01, 'Monthly spend is required.'),
});

const SPEND_DETAILS_SCHEMA = z.object({
  entries: z.record(z.string(), TOOL_ENTRY_SCHEMA),
});

type TeamContextValues = z.infer<typeof TEAM_CONTEXT_SCHEMA>;
type ToolSelectionValues = z.infer<typeof TOOL_SELECTION_SCHEMA>;
type SpendDetailsValues = z.infer<typeof SPEND_DETAILS_SCHEMA>;

const STEP_TITLES = ['Team Context', 'Tool Selection', 'Spend Details'] as const;

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function AuditPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const {
    teamSize,
    useCase,
    selectedTools,
    toolEntries,
    setTeamSize,
    setUseCase,
    toggleTool,
    setToolEntry,
  } = useAuditStore();

  const teamContextForm = useForm<TeamContextValues>({
    resolver: zodResolver(TEAM_CONTEXT_SCHEMA),
    defaultValues: {
      teamSize,
      useCase: (useCase || 'coding') as TeamContextValues['useCase'],
    },
  });

  const toolSelectionForm = useForm<ToolSelectionValues>({
    resolver: zodResolver(TOOL_SELECTION_SCHEMA),
    defaultValues: {
      selectedTools,
    },
  });

  const spendDetailsDefaults = useMemo(() => {
    const entries: Record<string, { planId: string; seats: number; monthlySpend: number }> = {};

    for (const toolId of selectedTools) {
      const existing = toolEntries[toolId];
      const defaultPlan = PRICING_DATA[toolId].plans[0]?.planId ?? '';

      entries[toolId] = {
        planId: existing?.planId || defaultPlan,
        seats: existing?.seats ?? teamSize,
        monthlySpend: existing?.monthlySpend ?? 0,
      };
    }

    return { entries };
  }, [selectedTools, toolEntries, teamSize]);

  const spendDetailsForm = useForm<SpendDetailsValues>({
    resolver: zodResolver(SPEND_DETAILS_SCHEMA),
    defaultValues: spendDetailsDefaults,
  });

  useEffect(() => {
    teamContextForm.reset({
      teamSize,
      useCase: (useCase || 'coding') as TeamContextValues['useCase'],
    });
  }, [teamContextForm, teamSize, useCase]);

  useEffect(() => {
    toolSelectionForm.reset({ selectedTools });
  }, [selectedTools, toolSelectionForm]);

  useEffect(() => {
    spendDetailsForm.reset(spendDetailsDefaults);
  }, [spendDetailsDefaults, spendDetailsForm]);

  const onTeamContextSubmit = (values: TeamContextValues) => {
    setTeamSize(values.teamSize);
    setUseCase(values.useCase);

    for (const toolId of selectedTools) {
      setToolEntry(toolId, { seats: values.teamSize });
    }

    setStep(2);
  };

  const onToolSelectionSubmit = (values: ToolSelectionValues) => {
    values.selectedTools.forEach((toolId) => {
      const existing = toolEntries[toolId];
      const defaultPlan = PRICING_DATA[toolId].plans[0]?.planId ?? '';

      setToolEntry(toolId, {
        planId: existing?.planId || defaultPlan,
        seats: existing?.seats ?? teamSize,
        monthlySpend: existing?.monthlySpend ?? 0,
      });
    });

    setStep(3);
  };

  const onSpendDetailsSubmit = async (values: SpendDetailsValues) => {
    const tools = selectedTools.map((toolId) => ({
      toolId,
      planId: values.entries[toolId].planId,
      seats: values.entries[toolId].seats,
      monthlySpend: values.entries[toolId].monthlySpend,
    }));

    for (const row of tools) {
      setToolEntry(row.toolId, {
        planId: row.planId,
        seats: row.seats,
        monthlySpend: row.monthlySpend,
      });
    }

    const resolvedUseCase: UseCase = useCase || 'coding';

    const auditResult = runAudit({
      teamSize,
      useCase: resolvedUseCase,
      tools,
    });

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auditResult),
      });

      if (response.ok) {
        const data = (await response.json()) as { shareId?: string };
        if (data.shareId) {
          router.push(`/results/${data.shareId}`);
          return;
        }
      }
    } catch {
      // Fall back to local shareId for navigation if API save fails.
    }

    router.push(`/results/${auditResult.shareId}`);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Spend Audit Setup</h1>
          <p className="text-sm text-muted-foreground">
            Tell us about your team and AI stack. We&apos;ll generate optimization recommendations in seconds.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>Step {step} of 3</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {STEP_TITLES.map((title, index) => {
                const stepNumber = (index + 1) as 1 | 2 | 3;
                const active = stepNumber === step;
                const complete = stepNumber < step;

                return (
                  <div
                    key={title}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm transition-colors',
                      complete && 'border-primary/30 bg-primary/10 text-primary',
                      active && 'border-primary bg-primary/5 text-foreground',
                      !active && !complete && 'border-border text-muted-foreground',
                    )}
                  >
                    <div className="text-xs font-medium uppercase tracking-wide">Step {stepNumber}</div>
                    <div className="font-medium">{title}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Team Context</CardTitle>
              <CardDescription>Set your team size and primary use case.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={teamContextForm.handleSubmit(onTeamContextSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="teamSize">Team Size</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    min={1}
                    {...teamContextForm.register('teamSize', { valueAsNumber: true })}
                  />
                  {teamContextForm.formState.errors.teamSize && (
                    <p className="text-sm text-destructive">{teamContextForm.formState.errors.teamSize.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="useCase">Primary Use Case</Label>
                  <select
                    id="useCase"
                    className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    {...teamContextForm.register('useCase')}
                  >
                    <option value="">Select a use case</option>
                    {USE_CASE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {titleCase(option)}
                      </option>
                    ))}
                  </select>
                  {teamContextForm.formState.errors.useCase && (
                    <p className="text-sm text-destructive">{teamContextForm.formState.errors.useCase.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" size="lg">
                    Next
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Tool Selection</CardTitle>
              <CardDescription>Choose every AI tool your team currently pays for.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={toolSelectionForm.handleSubmit(onToolSelectionSubmit)}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {TOOLS.map((tool) => {
                    const isSelected = selectedTools.includes(tool.toolId);

                    return (
                      <button
                        key={tool.toolId}
                        type="button"
                        onClick={() => {
                          toggleTool(tool.toolId);
                          const next = isSelected
                            ? selectedTools.filter((id) => id !== tool.toolId)
                            : [...selectedTools, tool.toolId];
                          toolSelectionForm.setValue('selectedTools', next, { shouldValidate: true });
                        }}
                        className={cn(
                          'group relative rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md',
                          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
                        )}
                      >
                        {isSelected && (
                          <span className="absolute top-3 right-3 inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3.5" />
                          </span>
                        )}
                        <p className="text-sm font-semibold text-foreground">{tool.displayName}</p>
                        <p className="text-xs text-muted-foreground">{tool.vendor}</p>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
                      </button>
                    );
                  })}
                </div>

                {toolSelectionForm.formState.errors.selectedTools && (
                  <p className="text-sm text-destructive">
                    {toolSelectionForm.formState.errors.selectedTools.message}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="submit" size="lg">
                    Next
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Spend Details</CardTitle>
              <CardDescription>
                Provide plan, seat count, and monthly spend for each selected tool.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={spendDetailsForm.handleSubmit(onSpendDetailsSubmit)}>
                {selectedTools.map((toolId) => {
                  const tool = TOOLS.find((item) => item.toolId === toolId);
                  const plans = PRICING_DATA[toolId].plans;

                  return (
                    <div key={toolId} className="rounded-xl border border-border bg-muted/20 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{tool?.displayName}</p>
                          <p className="text-xs text-muted-foreground">{tool?.vendor}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`${toolId}-plan`}>Plan</Label>
                          <select
                            id={`${toolId}-plan`}
                            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            {...spendDetailsForm.register(`entries.${toolId}.planId`)}
                          >
                            {plans.map((plan) => (
                              <option key={plan.planId} value={plan.planId}>
                                {plan.planName}
                              </option>
                            ))}
                          </select>
                          {spendDetailsForm.formState.errors.entries?.[toolId]?.planId && (
                            <p className="text-sm text-destructive">
                              {spendDetailsForm.formState.errors.entries[toolId]?.planId?.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`${toolId}-seats`}>Seats</Label>
                          <Input
                            id={`${toolId}-seats`}
                            type="number"
                            min={1}
                            {...spendDetailsForm.register(`entries.${toolId}.seats`, {
                              valueAsNumber: true,
                            })}
                          />
                          {spendDetailsForm.formState.errors.entries?.[toolId]?.seats && (
                            <p className="text-sm text-destructive">
                              {spendDetailsForm.formState.errors.entries[toolId]?.seats?.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`${toolId}-monthlySpend`}>Monthly Spend (USD)</Label>
                          <Input
                            id={`${toolId}-monthlySpend`}
                            type="number"
                            min={0.01}
                            step="0.01"
                            {...spendDetailsForm.register(`entries.${toolId}.monthlySpend`, {
                              valueAsNumber: true,
                            })}
                          />
                          {spendDetailsForm.formState.errors.entries?.[toolId]?.monthlySpend && (
                            <p className="text-sm text-destructive">
                              {spendDetailsForm.formState.errors.entries[toolId]?.monthlySpend?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-between pt-2">
                  <Button type="button" variant="outline" size="lg" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button type="submit" size="lg">
                    Run Audit
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
