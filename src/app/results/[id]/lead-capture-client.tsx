'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LeadCaptureClientProps {
  auditId: string;
  teamSize: number;
}

export function LeadCaptureClient({ auditId, teamSize }: LeadCaptureClientProps) {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          companyName: companyName || undefined,
          role: role || undefined,
          teamSize,
          auditId,
          website,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || 'Could not submit your information right now.');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Could not submit your information right now.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-dim/30 p-6 text-sm text-foreground flex items-center gap-3">
        <span className="material-symbols-outlined text-[#007AFF]">check_circle</span>
        Thanks. Your details were saved and we sent a confirmation email if delivery is enabled.
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="lead-email" className="text-muted-foreground font-semibold">Work Email</Label>
        <Input
          id="lead-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="bg-[#007AFF]/[0.02] border-[#007AFF]/20 focus-visible:ring-[#007AFF]/40 h-12"
          placeholder="you@company.com"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lead-company" className="text-muted-foreground font-semibold">Company Name (optional)</Label>
          <Input
            id="lead-company"
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            className="bg-[#007AFF]/[0.02] border-[#007AFF]/20 focus-visible:ring-[#007AFF]/40 h-12"
            placeholder="Acme Inc"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lead-role" className="text-muted-foreground font-semibold">Role (optional)</Label>
          <Input
            id="lead-role"
            type="text"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="bg-[#007AFF]/[0.02] border-[#007AFF]/20 focus-visible:ring-[#007AFF]/40 h-12"
            placeholder="CTO"
          />
        </div>
      </div>

      <div className="hidden" aria-hidden="true">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive font-medium">{error}</p>}

      <Button 
        type="submit" 
        size="lg" 
        disabled={submitting}
        className="w-full sm:w-auto h-12 rounded-full bg-[#007AFF] px-8 text-sm font-semibold text-white transition hover:bg-blue-600 shadow-[0_0_15px_rgba(0,122,255,0.3)] mt-2"
      >
        {submitting ? 'Submitting...' : 'Get Follow-up'}
      </Button>
    </form>
  );
}
