'use client';

import { type FormEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LeadCaptureClientProps {
  auditId: string;
  teamSize: number;
  showConsultationOption?: boolean;
}

export function LeadCaptureClient({
  auditId,
  teamSize,
  showConsultationOption = false,
}: LeadCaptureClientProps) {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [website, setWebsite] = useState('');
  const [wantsConsultation, setWantsConsultation] = useState(showConsultationOption);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedConsultation, setSubmittedConsultation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      document.body.style.removeProperty('overflow');
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        setOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.removeProperty('overflow');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, submitting]);

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
          wantsConsultation: showConsultationOption ? wantsConsultation : undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || 'Could not submit your information right now.');
        return;
      }

      setSubmitted(true);
      setSubmittedConsultation(showConsultationOption && wantsConsultation);
      setOpen(false);
      setEmail('');
      setCompanyName('');
      setRole('');
      setWebsite('');
      setWantsConsultation(showConsultationOption);
    } catch {
      setError('Could not submit your information right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        type="button"
        size="lg"
        className="h-12 rounded-full bg-[#007AFF] px-8 text-sm font-semibold text-white transition hover:bg-blue-600 shadow-[0_0_15px_rgba(0,122,255,0.3)]"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Get Follow-up Email
      </Button>

      {submitted && (
        <p className="text-sm text-foreground/80 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#007AFF] text-[18px]">check_circle</span>
          {submittedConsultation
            ? 'Details saved. Confirmation email sent and your Credex consultation request was captured.'
            : 'Details saved. Confirmation email sent if delivery is enabled.'}
        </p>
      )}

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity duration-200 ease-out ${
          open ? 'pointer-events-auto bg-black/60 opacity-100' : 'pointer-events-none bg-black/0 opacity-0'
        }`}
        onClick={() => {
          if (!submitting) {
            setOpen(false);
          }
        }}
        aria-hidden={!open}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Get Follow-up Email"
          className={`w-full max-w-xl rounded-2xl border border-border-subtle bg-surface-dim p-6 shadow-2xl transition-all duration-200 ease-out ${
            open ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0'
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Get Follow-up Email</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your details and we&apos;ll email your audit follow-up.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-full border border-border-subtle text-muted-foreground transition hover:text-foreground"
              onClick={() => {
                if (!submitting) {
                  setOpen(false);
                }
              }}
              aria-label="Close dialog"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

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

            {showConsultationOption && (
              <label className="flex items-start gap-3 rounded-xl border border-border-subtle bg-background/40 p-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#007AFF]"
                  checked={wantsConsultation}
                  onChange={(event) => setWantsConsultation(event.target.checked)}
                />
                <span className="text-sm text-foreground/80">
                  I want to book a Credex consultation to review this high-savings audit.
                </span>
              </label>
            )}

            {error && <p className="text-sm text-destructive font-medium">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (!submitting) {
                    setOpen(false);
                  }
                }}
                className="rounded-full px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="h-11 rounded-full bg-[#007AFF] px-6 text-sm font-semibold text-white transition hover:bg-blue-600 shadow-[0_0_15px_rgba(0,122,255,0.3)]"
              >
                {submitting ? 'Sending...' : 'Send Follow-up'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
