import { Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';
import { createSlidingWindowRateLimit, getClientIp } from '@/lib/rateLimit';
import { TOOLS } from '@/lib/tools';
import type { AuditRecommendation, ToolEntry, ToolId, UseCase } from '@/types/audit';
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

const TOOL_NAME_BY_ID = Object.fromEntries(
  TOOLS.map((tool) => [tool.toolId, tool.displayName]),
) as Record<ToolId, string>;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUseCase(useCase: UseCase): string {
  return useCase.charAt(0).toUpperCase() + useCase.slice(1);
}

function actionLabel(action: AuditRecommendation['recommendedAction']): string {
  switch (action) {
    case 'downgrade':
      return 'Downgrade';
    case 'switch':
      return 'Switch';
    case 'consolidate':
      return 'Consolidate';
    case 'keep':
      return 'Keep';
    default:
      return action;
  }
}

function actionColor(action: AuditRecommendation['recommendedAction']): string {
  switch (action) {
    case 'downgrade':
      return '#f59e0b';
    case 'switch':
      return '#3b82f6';
    case 'consolidate':
      return '#f97316';
    case 'keep':
      return '#10b981';
    default:
      return '#64748b';
  }
}

function buildReportEmailHtml(params: {
  reportUrl: string;
  teamSize: number;
  useCase: UseCase;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  tools: ToolEntry[];
  recommendations: AuditRecommendation[];
  summary: string | null;
}): string {
  const {
    reportUrl,
    teamSize,
    useCase,
    totalMonthlySavings,
    totalAnnualSavings,
    tools,
    recommendations,
    summary,
  } = params;

  const currentMonthlySpend = tools.reduce((sum, tool) => sum + tool.monthlySpend, 0);
  const projectedMonthlySpend = Math.max(0, currentMonthlySpend - totalMonthlySavings);

  const recommendationsBySavings = [...recommendations].sort(
    (a, b) => b.monthlySavings - a.monthlySavings,
  );
  const positiveSavingsRecommendations = recommendationsBySavings.filter(
    (recommendation) => recommendation.monthlySavings > 0,
  );
  const maxSavings = Math.max(...positiveSavingsRecommendations.map((item) => item.monthlySavings), 0);

  const actionCounts = recommendations.reduce<Record<AuditRecommendation['recommendedAction'], number>>(
    (acc, recommendation) => {
      acc[recommendation.recommendedAction] += 1;
      return acc;
    },
    { downgrade: 0, switch: 0, consolidate: 0, keep: 0 },
  );
  const actionTotal = recommendations.length || 1;

  const toolsRows = tools
    .map(
      (tool) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #111827;">${escapeHtml(TOOL_NAME_BY_ID[tool.toolId] || tool.toolId)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #111827;">${escapeHtml(tool.planId)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #111827; text-align:right;">${tool.seats}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #111827; text-align:right;">$${formatUsd(tool.monthlySpend)}</td>
      </tr>`,
    )
    .join('');

  const recRows = recommendationsBySavings
    .map((recommendation) => {
      const toolName = TOOL_NAME_BY_ID[recommendation.toolId] || recommendation.toolId;
      return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #111827;">${escapeHtml(toolName)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">
          <span style="display:inline-block; padding:2px 8px; border-radius:999px; background:${actionColor(recommendation.recommendedAction)}1A; color:${actionColor(recommendation.recommendedAction)}; font-weight:600;">
            ${actionLabel(recommendation.recommendedAction)}
          </span>
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #111827; text-align:right;">$${formatUsd(recommendation.monthlySavings)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #374151;">${escapeHtml(recommendation.reasoning)}</td>
      </tr>`;
    })
    .join('');

  const savingsBars = positiveSavingsRecommendations
    .slice(0, 6)
    .map((recommendation) => {
      const toolName = TOOL_NAME_BY_ID[recommendation.toolId] || recommendation.toolId;
      const widthPct =
        maxSavings > 0
          ? Math.max(6, Math.round((recommendation.monthlySavings / maxSavings) * 100))
          : 0;

      return `
      <tr>
        <td style="padding: 6px 0; width: 42%; font-size: 13px; color: #111827;">${escapeHtml(toolName)}</td>
        <td style="padding: 6px 8px; width: 43%;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="height:8px; background:#e5e7eb; border-radius:999px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${widthPct}%">
                  <tr><td style="height:8px; background:#007AFF; border-radius:999px;"></td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
        <td style="padding: 6px 0; width: 15%; text-align:right; font-size: 13px; color: #059669; font-weight:600;">$${formatUsd(recommendation.monthlySavings)}/mo</td>
      </tr>`;
    })
    .join('');

  const actionSegments = (
    ['downgrade', 'switch', 'consolidate', 'keep'] as const
  )
    .map((action) => {
      const count = actionCounts[action];
      if (count === 0) {
        return '';
      }

      const widthPct = Math.max(4, Math.round((count / actionTotal) * 100));
      return `<td width="${widthPct}%" style="height:10px; background:${actionColor(action)};"></td>`;
    })
    .join('');

  const summaryBlock = summary
    ? `
      <tr>
        <td style="padding: 18px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px;">
          <p style="margin:0 0 6px; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700;">AI Summary</p>
          <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">${escapeHtml(summary)}</p>
        </td>
      </tr>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your Spendly Audit Report</title>
  </head>
  <body style="margin:0; padding:0; background:#f3f4f6; font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" style="width:680px; max-width:680px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:28px 28px 20px; background:linear-gradient(135deg,#0f172a,#111827);">
                <p style="margin:0; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#93c5fd; font-weight:700;">Spendly Audit Report</p>
                <h1 style="margin:10px 0 0; font-size:28px; line-height:1.2; color:#ffffff;">Your full AI spend report is ready</h1>
                <p style="margin:10px 0 0; font-size:14px; color:#cbd5e1;">Team size: ${teamSize} • Use case: ${escapeHtml(formatUseCase(useCase))}</p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="50%" style="padding-right:8px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb; border-radius:12px;">
                        <tr><td style="padding:16px;">
                          <p style="margin:0; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700;">Potential Monthly Savings</p>
                          <p style="margin:6px 0 0; font-size:30px; color:#0f172a; font-weight:800;">$${formatUsd(totalMonthlySavings)}</p>
                        </td></tr>
                      </table>
                    </td>
                    <td width="50%" style="padding-left:8px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb; border-radius:12px;">
                        <tr><td style="padding:16px;">
                          <p style="margin:0; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700;">Potential Annual Savings</p>
                          <p style="margin:6px 0 0; font-size:30px; color:#0f172a; font-weight:800;">$${formatUsd(totalAnnualSavings)}</p>
                        </td></tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 18px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb; border-radius:12px;">
                  <tr><td style="padding:16px;">
                    <p style="margin:0 0 10px; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700;">Spend Projection</p>
                    <p style="margin:0 0 6px; font-size:13px; color:#111827;">Current spend: <strong>$${formatUsd(currentMonthlySpend)}/mo</strong></p>
                    <p style="margin:0 0 10px; font-size:13px; color:#111827;">Projected spend after actions: <strong>$${formatUsd(projectedMonthlySpend)}/mo</strong></p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td style="height:8px; background:#e5e7eb; border-radius:999px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:8px; background:#111827; border-radius:999px;"></td></tr></table>
                      </td></tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
                      <tr><td style="height:8px; background:#e5e7eb; border-radius:999px;">
                        <table role="presentation" width="${
                          currentMonthlySpend > 0
                            ? Math.max(2, Math.round((projectedMonthlySpend / currentMonthlySpend) * 100))
                            : 100
                        }%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:8px; background:#007AFF; border-radius:999px;"></td></tr></table>
                      </td></tr>
                    </table>
                  </td></tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 18px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb; border-radius:12px;">
                  <tr><td style="padding:16px;">
                    <p style="margin:0 0 10px; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700;">Savings by Tool</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${
                        savingsBars ||
                        '<tr><td style="font-size:13px; color:#64748b;">No positive savings opportunities found in this report yet.</td></tr>'
                      }
                    </table>
                  </td></tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 18px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb; border-radius:12px;">
                  <tr><td style="padding:16px;">
                    <p style="margin:0 0 10px; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700;">Action Mix</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>${actionSegments || '<td width="100%" style="height:10px; background:#e5e7eb;"></td>'}</tr>
                    </table>
                    <p style="margin:10px 0 0; font-size:12px; color:#475569;">Downgrade: ${actionCounts.downgrade} • Switch: ${actionCounts.switch} • Consolidate: ${actionCounts.consolidate} • Keep: ${actionCounts.keep}</p>
                  </td></tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 18px;">
                <p style="margin:0 0 10px; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700;">Current Stack</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
                  <thead>
                    <tr style="background:#f8fafc;">
                      <th align="left" style="padding:10px 12px; font-size:12px; color:#334155;">Tool</th>
                      <th align="left" style="padding:10px 12px; font-size:12px; color:#334155;">Plan</th>
                      <th align="right" style="padding:10px 12px; font-size:12px; color:#334155;">Seats</th>
                      <th align="right" style="padding:10px 12px; font-size:12px; color:#334155;">Monthly Spend</th>
                    </tr>
                  </thead>
                  <tbody>${toolsRows}</tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 18px;">
                <p style="margin:0 0 10px; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; font-weight:700;">Per-Tool Recommendations</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
                  <thead>
                    <tr style="background:#f8fafc;">
                      <th align="left" style="padding:10px 12px; font-size:12px; color:#334155;">Tool</th>
                      <th align="left" style="padding:10px 12px; font-size:12px; color:#334155;">Action</th>
                      <th align="right" style="padding:10px 12px; font-size:12px; color:#334155;">Savings/mo</th>
                      <th align="left" style="padding:10px 12px; font-size:12px; color:#334155;">Reasoning</th>
                    </tr>
                  </thead>
                  <tbody>${recRows}</tbody>
                </table>
              </td>
            </tr>

            ${summaryBlock}

            <tr>
              <td style="padding: 8px 28px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding: 12px 0 0;">
                      <a href="${escapeHtml(reportUrl)}" style="display:inline-block; background:#007AFF; color:#ffffff; text-decoration:none; font-size:14px; font-weight:700; padding:12px 22px; border-radius:999px;">Open Interactive Report</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildReportEmailText(params: {
  reportUrl: string;
  teamSize: number;
  useCase: UseCase;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  recommendations: AuditRecommendation[];
}): string {
  const { reportUrl, teamSize, useCase, totalMonthlySavings, totalAnnualSavings, recommendations } = params;
  const topRecommendations = [...recommendations]
    .sort((a, b) => b.monthlySavings - a.monthlySavings)
    .slice(0, 3)
    .map((recommendation) => {
      const toolName = TOOL_NAME_BY_ID[recommendation.toolId] || recommendation.toolId;
      return `- ${toolName}: ${actionLabel(recommendation.recommendedAction)} ($${formatUsd(recommendation.monthlySavings)}/mo)`;
    })
    .join('\n');

  return `Your full Spendly audit report is ready.

Team: ${teamSize}
Use case: ${formatUseCase(useCase)}
Potential savings: $${formatUsd(totalMonthlySavings)}/month ($${formatUsd(totalAnnualSavings)}/year)

Top opportunities:
${topRecommendations || '- No positive savings opportunities found yet.'}

Open interactive report:
${reportUrl}`;
}

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
        shareId: true,
        tools: true,
        auditResults: true,
        totalMonthlySavings: true,
        totalAnnualSavings: true,
        savingsTier: true,
        useCase: true,
        teamSize: true,
        summary: true,
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
        const tools = Array.isArray(audit.tools) ? (audit.tools as unknown as ToolEntry[]) : [];
        const recommendations = Array.isArray(audit.auditResults)
          ? (audit.auditResults as unknown as AuditRecommendation[])
          : [];
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
        const reportUrl = `${appUrl}/results/${audit.shareId}`;

        const html = buildReportEmailHtml({
          reportUrl,
          teamSize: audit.teamSize,
          useCase: audit.useCase as UseCase,
          totalMonthlySavings: audit.totalMonthlySavings,
          totalAnnualSavings: audit.totalAnnualSavings,
          tools,
          recommendations,
          summary: audit.summary,
        });
        const text = buildReportEmailText({
          reportUrl,
          teamSize: audit.teamSize,
          useCase: audit.useCase as UseCase,
          totalMonthlySavings: audit.totalMonthlySavings,
          totalAnnualSavings: audit.totalAnnualSavings,
          recommendations,
        });

        await resend.emails.send({
          from: 'Spendly <onboarding@resend.dev>',
          to: payload.email,
          subject: `Your full Spendly audit report — potential $${formatUsd(audit.totalMonthlySavings)}/month`,
          html,
          text,
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
