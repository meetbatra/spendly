import { Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';
import { createSlidingWindowRateLimit, getClientIp } from '@/lib/rateLimit';
import { Resend } from 'resend';
import { z } from 'zod';

const captureLimiter = createSlidingWindowRateLimit(5, '1 h', 'spendly:lead-capture');

const captureSchema = z.object({
  email: z.string().email('Please provide a valid email address.'),
  companyName: z.string().trim().optional(),
  role: z.string().trim().optional(),
  teamSize: z.number().int().min(1).optional(),
  auditId: z.string().min(1, 'auditId is required.'),
  website: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      {
        error: 'Database is not configured. Missing DATABASE_URL environment variable.',
      },
      { status: 503 },
    );
  }

  if (captureLimiter) {
    const ip = getClientIp(request);
    const limit = await captureLimiter.limit(ip);

    if (!limit.success) {
      return Response.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit.limit),
            'X-RateLimit-Remaining': String(limit.remaining),
            'X-RateLimit-Reset': String(limit.reset),
          },
        },
      );
    }
  }

  let payload: z.infer<typeof captureSchema>;

  try {
    const body = await request.json();
    payload = captureSchema.parse(body);
  } catch {
    return Response.json(
      {
        error: 'Invalid capture payload.',
      },
      { status: 400 },
    );
  }

  if (payload.website && payload.website.trim().length > 0) {
    return Response.json({ ok: true, skipped: true }, { status: 200 });
  }

  try {
    const prisma = getPrisma();

    const audit = await prisma.audit.findUnique({
      where: { shareId: payload.auditId },
      select: {
        totalMonthlySavings: true,
        savingsTier: true,
      },
    });

    if (!audit) {
      return Response.json(
        {
          error: 'Audit not found for provided auditId.',
        },
        { status: 404 },
      );
    }

    await prisma.lead.create({
      data: {
        email: payload.email,
        companyName: payload.companyName || null,
        role: payload.role || null,
        teamSize: payload.teamSize ?? null,
        auditId: payload.auditId,
        savingsTier: audit.savingsTier,
      },
    });

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const highSavingsLine =
          audit.totalMonthlySavings > 500
            ? 'Because your savings are high, the Credex team will reach out with discounted AI credit options.'
            : 'If your AI spend grows, Credex can help with discounted AI credits.';

        await resend.emails.send({
          from: 'Spendly <onboarding@resend.dev>',
          to: payload.email,
          subject: 'Your Spendly audit is saved',
          text: `Thanks for using Spendly. Your current audit shows potential savings of $${audit.totalMonthlySavings}/month. ${highSavingsLine}`,
        });
      } catch {
        // Silent by requirement: if email provider isn't available, do not fail capture.
      }
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return Response.json(
        {
          error: 'Failed to save lead data.',
          code: error.code,
        },
        { status: 500 },
      );
    }

    return Response.json(
      {
        error: 'Failed to process lead capture request.',
      },
      { status: 500 },
    );
  }
}
