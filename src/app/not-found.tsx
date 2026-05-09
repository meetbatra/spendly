import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The page you requested could not be found. It may have been moved or the link may be incorrect.
        </p>
        <div className="mt-6">
          <Link href="/" className={cn(buttonVariants({ size: 'lg' }))}>
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
