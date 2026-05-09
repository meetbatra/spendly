'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Useful during debugging and incident triage.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We hit an unexpected error while loading this page. Please try again.
        </p>
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={reset}>
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
