import { getPrisma } from '@/lib/prisma';
import { buildAuditPdfBuffer } from '@/lib/reportPdf';
import type { AuditRecommendation, ToolEntry, UseCase } from '@/types/audit';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      {
        error: 'Database is not configured. Missing DATABASE_URL environment variable.',
      },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  try {
    const prisma = getPrisma();

    const audit = await prisma.audit.findUnique({
      where: { shareId: id },
      select: {
        shareId: true,
        tools: true,
        auditResults: true,
        totalMonthlySavings: true,
        totalAnnualSavings: true,
        summary: true,
        useCase: true,
        teamSize: true,
        createdAt: true,
      },
    });

    if (!audit) {
      return Response.json({ error: 'Audit not found.' }, { status: 404 });
    }

    const pdfBuffer = await buildAuditPdfBuffer({
      shareId: audit.shareId,
      teamSize: audit.teamSize,
      useCase: audit.useCase as UseCase,
      totalMonthlySavings: audit.totalMonthlySavings,
      totalAnnualSavings: audit.totalAnnualSavings,
      tools: audit.tools as unknown as ToolEntry[],
      recommendations: audit.auditResults as unknown as AuditRecommendation[],
      summary: audit.summary,
      generatedAt: audit.createdAt,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="spendly audit-${audit.shareId}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return Response.json({ error: 'Failed to generate PDF report.' }, { status: 500 });
  }
}
