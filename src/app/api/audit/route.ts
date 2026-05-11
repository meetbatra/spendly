import { Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';
import { createSlidingWindowRateLimit, getClientIp } from '@/lib/rateLimit';
import type { AuditResult } from '@/types/audit';
import { z } from 'zod';

const auditSubmissionLimiter = createSlidingWindowRateLimit(10, '1 h', 'spendly:audit-submissions');
const isAuditRateLimitEnabled = process.env.ENABLE_AUDIT_RATE_LIMIT === 'true';

const toolEntrySchema = z.object({
  toolId: z.string().min(1),
  planId: z.string().min(1),
  monthlySpend: z.number().nonnegative(),
  seats: z.number().int().min(1),
});

const recommendationSchema = z.object({
  toolId: z.string().min(1),
  currentPlanId: z.string().min(1),
  currentMonthlyCost: z.number().nonnegative(),
  recommendedAction: z.enum(['downgrade', 'switch', 'consolidate', 'keep']),
  recommendedPlanId: z.string().optional(),
  recommendedToolId: z.string().optional(),
  monthlySavings: z.number().nonnegative(),
  annualSavings: z.number().nonnegative(),
  reasoning: z.string().min(1),
  credexRelevant: z.boolean(),
});

const auditResultSchema = z.object({
  input: z.object({
    tools: z.array(toolEntrySchema).min(1),
    teamSize: z.number().int().min(1),
    useCase: z.enum(['coding', 'writing', 'data', 'research', 'mixed']),
  }),
  recommendations: z.array(recommendationSchema),
  totalMonthlySavings: z.number().nonnegative(),
  totalAnnualSavings: z.number().nonnegative(),
  savingsTier: z.enum(['none', 'low', 'medium', 'high']),
  generatedAt: z.union([z.string(), z.date()]).optional(),
  shareId: z.string().min(1),
  summary: z.string().optional(),
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

  if (isAuditRateLimitEnabled && auditSubmissionLimiter) {
    const ip = getClientIp(request);
    const limit = await auditSubmissionLimiter.limit(ip);

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

  let parsedBody: AuditResult;

  try {
    const body = await request.json();
    parsedBody = auditResultSchema.parse(body) as AuditResult;
  } catch {
    return Response.json(
      {
        error: 'Invalid request body. Expected a complete AuditResult payload.',
      },
      { status: 400 },
    );
  }

  try {
    const prisma = getPrisma();

    const createdAudit = await prisma.audit.create({
      data: {
        shareId: parsedBody.shareId,
        tools: parsedBody.input.tools as unknown as Prisma.InputJsonValue,
        auditResults: parsedBody.recommendations as unknown as Prisma.InputJsonValue,
        totalMonthlySavings: parsedBody.totalMonthlySavings,
        totalAnnualSavings: parsedBody.totalAnnualSavings,
        summary: parsedBody.summary,
        useCase: parsedBody.input.useCase,
        teamSize: parsedBody.input.teamSize,
        savingsTier: parsedBody.savingsTier,
      },
      select: {
        shareId: true,
      },
    });

    return Response.json({ shareId: createdAudit.shareId }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return Response.json(
        {
          error: 'An audit with this shareId already exists.',
        },
        { status: 409 },
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return Response.json(
        {
          error: 'Database request failed while saving the audit.',
          code: error.code,
        },
        { status: 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return Response.json(
        {
          error: 'Database connection could not be initialized.',
        },
        { status: 503 },
      );
    }

    return Response.json(
      {
        error: 'Unexpected error while saving audit.',
      },
      { status: 500 },
    );
  }
}
