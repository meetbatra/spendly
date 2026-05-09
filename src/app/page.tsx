import Link from 'next/link';
import { ArrowRight, BadgeDollarSign, BarChart3, CheckCircle2, Sparkles, Zap } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HOW_IT_WORKS = [
  {
    title: 'Step 1',
    heading: 'Enter your AI tools',
    description: 'Pick the tools your team pays for and add your real monthly spend in under two minutes.',
    icon: Sparkles,
  },
  {
    title: 'Step 2',
    heading: 'Get your instant audit',
    description: 'Spendly runs a rule-based analysis to find overlaps, seat waste, and pricing mismatches immediately.',
    icon: BarChart3,
  },
  {
    title: 'Step 3',
    heading: 'Start saving immediately',
    description: 'Follow prioritized recommendations and reduce recurring AI costs with clear next actions.',
    icon: CheckCircle2,
  },
] as const;

const SAVINGS_SCENARIOS = [
  {
    title: '5-person startup',
    savings: '$340/month',
    description: 'Saved by consolidating Cursor and Copilot into one coding workflow.',
  },
  {
    title: 'Solo founder',
    savings: '$180/month',
    description: 'Saved by downgrading from ChatGPT Pro to Plus based on real usage.',
  },
  {
    title: '10-person team',
    savings: '$720/month',
    description: 'Saved by switching to optimal plans across multiple AI tools.',
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-white text-foreground">
      <header className="border-b border-green-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-green-900">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-green-600 text-white">
              <Zap className="size-4" />
            </span>
            Spendly
          </Link>

          <Link href="/audit" className={cn(buttonVariants({ size: 'lg' }), 'bg-green-600 text-white hover:bg-green-700')}>
            Audit My Stack
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-green-800">
              AI Spend Audit for Startups
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-green-950 sm:text-5xl">
              Stop Overspending on AI Tools in Minutes
            </h1>
            <p className="mt-5 text-balance text-base leading-7 text-green-900/80 sm:text-lg">
              Spendly audits your stack, flags waste instantly, and shows exactly where your team can save money every month.
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                href="/audit"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-11 px-6 text-base bg-green-600 text-white hover:bg-green-700',
                )}
              >
                Audit My Stack — It&apos;s Free
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </div>

            {/* Mocked social proof text for early launch presentation */}
            <p className="mt-4 text-sm text-green-800/70">Join 200+ founders who found savings.</p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-green-950 sm:text-3xl">How It Works</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => {
              const Icon = step.icon;

              return (
                <Card key={step.title} className="border-green-100 bg-white">
                  <CardHeader>
                    <div className="mb-2 inline-flex size-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                      <Icon className="size-4" />
                    </div>
                    <CardDescription className="text-green-800/70">{step.title}</CardDescription>
                    <CardTitle className="text-green-950">{step.heading}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-green-900/75">{step.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-center gap-2 text-center">
            <BadgeDollarSign className="size-5 text-green-700" />
            <h2 className="text-2xl font-semibold tracking-tight text-green-950 sm:text-3xl">Savings Showcase</h2>
          </div>

          {/* Mocked savings scenarios for marketing preview */}
          <div className="grid gap-4 md:grid-cols-3">
            {SAVINGS_SCENARIOS.map((scenario) => (
              <Card key={scenario.title} className="border-green-100 bg-green-50/60">
                <CardHeader>
                  <CardDescription className="text-green-800">{scenario.title}</CardDescription>
                  <CardTitle className="text-3xl text-green-700">{scenario.savings}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-green-900/80">{scenario.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 pb-14 pt-10 text-center sm:px-6 lg:px-8 lg:pb-20">
          <div className="rounded-2xl border border-green-200 bg-green-600 px-6 py-10 text-white sm:px-10">
            <h2 className="text-3xl font-semibold tracking-tight">Ready to cut your AI spend this week?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-green-100">
              Start your free audit now and get immediate recommendations tailored to your exact tools and team size.
            </p>
            <div className="mt-6">
              <Link
                href="/audit"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-11 bg-white px-6 text-base text-green-700 hover:bg-green-100',
                )}
              >
                Audit My Stack — It&apos;s Free
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-green-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="font-semibold text-green-900">Spendly</p>
            <p className="text-green-800/70">Find hidden AI subscription waste before your next billing cycle.</p>
          </div>
          <a
            href="https://credex.rocks"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-green-700 underline-offset-4 hover:text-green-800 hover:underline"
          >
            Powered by Credex
          </a>
        </div>
      </footer>
    </div>
  );
}
