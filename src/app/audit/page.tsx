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
    <div className="min-h-screen bg-background relative overflow-hidden pt-[100px] pb-20 px-4">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(150,150,150,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(150,150,150,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#007AFF] rounded-full blur-[150px] opacity-[0.05] pointer-events-none"></div>
      
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 relative z-10">
        <div className="space-y-3 text-center mb-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Spend Audit Setup</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Tell us about your team and AI stack. We&apos;ll generate optimization recommendations in seconds.
          </p>
        </div>

        <Card className="border-border-subtle bg-surface-dim/50 backdrop-blur-md shadow-xl overflow-hidden">
          <CardContent className="p-0">
            {/* Stepper Header */}
            <div className="flex border-b border-border-subtle bg-background/50">
              {STEP_TITLES.map((title, index) => {
                const stepNumber = (index + 1) as 1 | 2 | 3;
                const active = stepNumber === step;
                const complete = stepNumber < step;

                return (
                  <div
                    key={title}
                    className={cn(
                      'flex-1 p-4 text-center transition-colors border-r last:border-r-0 border-border-subtle',
                      active ? 'bg-surface-dim shadow-[inset_0_-2px_0_#007AFF]' : 'opacity-60',
                    )}
                  >
                    <div className={cn(
                      "text-xs font-semibold tracking-wider uppercase mb-1 transition-colors",
                      active || complete ? "text-[#007AFF]" : "text-muted-foreground"
                    )}>
                      Step {stepNumber}
                    </div>
                    <div className={cn(
                      "font-medium text-sm transition-colors",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {title}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 md:p-8">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-1 mb-6">
                    <h2 className="text-2xl font-semibold">Team Context</h2>
                    <p className="text-muted-foreground">Set your team size and primary use case.</p>
                  </div>
                  
                  <form className="space-y-6" onSubmit={teamContextForm.handleSubmit(onTeamContextSubmit)}>
                    <div className="space-y-3">
                      <Label htmlFor="teamSize" className="text-sm font-medium">Team Size</Label>
                      <Input
                        id="teamSize"
                        type="number"
                        min={1}
                        className="bg-background/50 border-border-subtle focus-visible:ring-[#007AFF]/50 focus-visible:border-[#007AFF] transition-all h-12"
                        {...teamContextForm.register('teamSize', { valueAsNumber: true })}
                      />
                      {teamContextForm.formState.errors.teamSize && (
                        <p className="text-sm text-destructive">{teamContextForm.formState.errors.teamSize.message}</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="useCase" className="text-sm font-medium">Primary Use Case</Label>
                      <select
                        id="useCase"
                        className="h-12 w-full rounded-lg border border-border-subtle bg-background/50 px-3 text-sm outline-none transition-all focus-visible:border-[#007AFF] focus-visible:ring-3 focus-visible:ring-[#007AFF]/50 text-foreground"
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

                    <div className="flex justify-end pt-4 border-t border-border-subtle">
                      <Button type="submit" size="lg" className="bg-[#007AFF] text-white hover:bg-blue-600 shadow-[0_0_15px_rgba(0,122,255,0.3)] rounded-full px-8">
                        Next Step <span className="material-symbols-outlined ml-2 text-[20px]">arrow_forward</span>
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-1 mb-6">
                    <h2 className="text-2xl font-semibold">Tool Selection</h2>
                    <p className="text-muted-foreground">Choose every AI tool your team currently pays for.</p>
                  </div>
                  
                  <form className="space-y-6" onSubmit={toolSelectionForm.handleSubmit(onToolSelectionSubmit)}>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                              'group relative rounded-xl border p-5 text-left transition-all duration-300',
                              isSelected 
                                ? 'bg-[#007AFF]/10 border-[#007AFF] shadow-[0_0_20px_rgba(0,122,255,0.15)]' 
                                : 'bg-background/40 border-border-subtle hover:bg-surface-dim hover:border-border hover:-translate-y-1 hover:shadow-lg',
                            )}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className={cn("font-semibold", isSelected ? "text-[#007AFF]" : "text-foreground")}>{tool.displayName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{tool.vendor}</p>
                              </div>
                              <div className={cn(
                                "flex size-6 items-center justify-center rounded-full border transition-all duration-300",
                                isSelected ? "bg-[#007AFF] border-[#007AFF] text-white" : "border-border-subtle text-transparent group-hover:border-border"
                              )}>
                                <Check className="size-3.5" />
                              </div>
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
                          </button>
                        );
                      })}
                    </div>

                    {toolSelectionForm.formState.errors.selectedTools && (
                      <p className="text-sm text-destructive">
                        {toolSelectionForm.formState.errors.selectedTools.message}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                      <Button type="button" variant="ghost" onClick={() => setStep(1)} className="rounded-full px-6 text-muted-foreground hover:text-foreground">
                        Back
                      </Button>
                      <Button type="submit" size="lg" className="bg-[#007AFF] text-white hover:bg-blue-600 shadow-[0_0_15px_rgba(0,122,255,0.3)] rounded-full px-8">
                        Next Step <span className="material-symbols-outlined ml-2 text-[20px]">arrow_forward</span>
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-1 mb-6">
                    <h2 className="text-2xl font-semibold">Spend Details</h2>
                    <p className="text-muted-foreground">
                      Provide plan, seat count, and monthly spend for each selected tool.
                    </p>
                  </div>
                  
                  <form className="space-y-6" onSubmit={spendDetailsForm.handleSubmit(onSpendDetailsSubmit)}>
                    <div className="space-y-4">
                      {selectedTools.map((toolId) => {
                        const tool = TOOLS.find((item) => item.toolId === toolId);
                        const plans = PRICING_DATA[toolId].plans;

                        return (
                          <div key={toolId} className="rounded-xl border border-border-subtle bg-background/40 p-5 transition-all hover:border-border">
                            <div className="mb-4">
                              <p className="font-semibold text-foreground text-lg">{tool?.displayName}</p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label htmlFor={`${toolId}-plan`} className="text-xs font-medium text-muted-foreground">Plan</Label>
                                <select
                                  id={`${toolId}-plan`}
                                  className="h-10 w-full rounded-lg border border-border-subtle bg-background/80 px-2.5 text-sm outline-none transition-all focus-visible:border-[#007AFF] focus-visible:ring-3 focus-visible:ring-[#007AFF]/50 text-foreground"
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
                                <Label htmlFor={`${toolId}-seats`} className="text-xs font-medium text-muted-foreground">Seats</Label>
                                <Input
                                  id={`${toolId}-seats`}
                                  type="number"
                                  min={1}
                                  className="h-10 bg-background/80 border-border-subtle focus-visible:ring-[#007AFF]/50 focus-visible:border-[#007AFF]"
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
                                <Label htmlFor={`${toolId}-monthlySpend`} className="text-xs font-medium text-muted-foreground">Monthly Spend ($)</Label>
                                <Input
                                  id={`${toolId}-monthlySpend`}
                                  type="number"
                                  min={0.01}
                                  step="0.01"
                                  className="h-10 bg-background/80 border-border-subtle focus-visible:ring-[#007AFF]/50 focus-visible:border-[#007AFF]"
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
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                      <Button type="button" variant="ghost" onClick={() => setStep(2)} className="rounded-full px-6 text-muted-foreground hover:text-foreground">
                        Back
                      </Button>
                      <Button type="submit" size="lg" className="bg-[#007AFF] text-white hover:bg-blue-600 shadow-[0_0_20px_rgba(0,122,255,0.4)] rounded-full px-8">
                        Run Optimization Audit <span className="material-symbols-outlined ml-2 text-[20px]">insights</span>
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
