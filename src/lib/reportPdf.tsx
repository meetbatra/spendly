import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';

import { TOOLS } from '@/lib/tools';
import type { AuditRecommendation, ToolEntry, UseCase } from '@/types/audit';

export interface AuditPdfPayload {
  shareId: string;
  teamSize: number;
  useCase: UseCase;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  tools: ToolEntry[];
  recommendations: AuditRecommendation[];
  summary: string | null;
  generatedAt: Date;
}

const TOOL_NAME_BY_ID = Object.fromEntries(
  TOOLS.map((tool) => [tool.toolId, tool.displayName]),
) as Record<string, string>;

const ACTION_ORDER: AuditRecommendation['recommendedAction'][] = [
  'downgrade',
  'switch',
  'consolidate',
  'keep',
];

const ACTION_COLORS: Record<AuditRecommendation['recommendedAction'], string> = {
  downgrade: '#f59e0b',
  switch: '#3b82f6',
  consolidate: '#f97316',
  keep: '#10b981',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingRight: 24,
    paddingBottom: 42,
    paddingLeft: 24,
    fontSize: 10,
    backgroundColor: '#0F0F0F',
    color: '#F5F5F5',
    fontFamily: 'Helvetica',
  },
  headerCard: {
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#111111',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 9,
    color: '#A1A1AA',
    marginBottom: 2,
  },
  accent: {
    color: '#007AFF',
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 7,
    color: '#E5E7EB',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#111111',
  },
  kpiLabel: {
    color: '#A1A1AA',
    fontSize: 9,
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  text: {
    fontSize: 9.5,
    lineHeight: 1.45,
    color: '#D4D4D8',
  },
  card: {
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    backgroundColor: '#111111',
    padding: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    paddingBottom: 6,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  headerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#A1A1AA',
  },
  cellText: {
    fontSize: 9,
    color: '#F5F5F5',
  },
  colTool: { flex: 1.2 },
  colPlan: { flex: 1 },
  colSeats: { flex: 0.7, textAlign: 'right' },
  colMoney: { flex: 1, textAlign: 'right' },
  recColAction: { flex: 0.9 },
  recColReason: { flex: 2.4 },
  cellBase: {
    paddingRight: 8,
  },
  cellRight: {
    alignItems: 'flex-end',
  },
  badgeWrap: {
    paddingRight: 8,
  },
  reasonCell: {
    paddingLeft: 4,
  },
  reasonText: {
    fontSize: 8.6,
    lineHeight: 1.35,
    color: '#F5F5F5',
  },
  muted: {
    color: '#A1A1AA',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  chartGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  chartCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    backgroundColor: '#111111',
    padding: 10,
  },
  chartTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#A1A1AA',
    marginBottom: 8,
  },
  chartRow: {
    marginBottom: 7,
  },
  chartRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  chartLabel: {
    fontSize: 8.5,
    color: '#D4D4D8',
  },
  chartValue: {
    fontSize: 8.5,
    color: '#F5F5F5',
  },
  chartTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#27272A',
    overflow: 'hidden',
  },
  chartBarCurrent: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  chartBarProjected: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  chartBarOpportunity: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  actionMixTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#27272A',
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 10,
  },
  actionMixSegment: {
    height: '100%',
  },
  actionMixLegendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionMixLegendItem: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionMixLegendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionMixDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  actionMixLegendLabel: {
    fontSize: 8.5,
    color: '#D4D4D8',
    textTransform: 'capitalize',
  },
  actionMixLegendCount: {
    fontSize: 8.5,
    color: '#F5F5F5',
    fontWeight: 'bold',
  },
  badge: {
    fontSize: 8,
    color: '#7DD3FC',
    borderWidth: 1,
    borderColor: '#1D4ED8',
    borderRadius: 999,
    paddingTop: 2,
    paddingBottom: 2,
    paddingHorizontal: 6,
  },
  footer: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#71717A',
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    paddingTop: 6,
  },
});

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatUseCase(useCase: UseCase): string {
  return useCase.charAt(0).toUpperCase() + useCase.slice(1);
}

function formatAction(action: AuditRecommendation['recommendedAction']): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export async function buildAuditPdfBuffer(payload: AuditPdfPayload): Promise<Buffer> {
  const currentMonthlySpend = payload.tools.reduce((sum, tool) => sum + tool.monthlySpend, 0);
  const projectedMonthlySpend = Math.max(0, currentMonthlySpend - payload.totalMonthlySavings);
  const sortedRecommendations = [...payload.recommendations].sort(
    (a, b) => b.monthlySavings - a.monthlySavings,
  );
  const recommendationsWithSavings = sortedRecommendations.filter((row) => row.monthlySavings > 0);
  const topThree = sortedRecommendations.filter((row) => row.monthlySavings > 0).slice(0, 3);
  const topOpportunitiesForChart = recommendationsWithSavings.slice(0, 4);
  const maxOpportunitySavings =
    topOpportunitiesForChart.length > 0
      ? Math.max(...topOpportunitiesForChart.map((row) => row.monthlySavings))
      : 0;
  const actionCounts = payload.recommendations.reduce<
    Record<AuditRecommendation['recommendedAction'], number>
  >(
    (acc, item) => {
      acc[item.recommendedAction] += 1;
      return acc;
    },
    { downgrade: 0, switch: 0, consolidate: 0, keep: 0 },
  );
  const actionTotal = payload.recommendations.length;

  const document = (
    <Document title={`Spendly Audit ${payload.shareId}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerCard}>
          <Text style={styles.title}>Spendly Audit Report</Text>
          <Text style={styles.subtitle}>Share ID: {payload.shareId}</Text>
          <Text style={styles.subtitle}>
            Team: {payload.teamSize} • Use case: {formatUseCase(payload.useCase)} • Generated:{' '}
            {payload.generatedAt.toLocaleDateString('en-US')}
          </Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle} minPresenceAhead={40}>
            Key Savings Snapshot
          </Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Potential Monthly Savings</Text>
              <Text style={[styles.kpiValue, styles.accent]}>${formatUsd(payload.totalMonthlySavings)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Potential Annual Savings</Text>
              <Text style={[styles.kpiValue, styles.accent]}>${formatUsd(payload.totalAnnualSavings)}</Text>
            </View>
          </View>
          <Text style={[styles.text, styles.muted]}>
            Current monthly spend: ${formatUsd(currentMonthlySpend)} • Projected after actions: $
            {formatUsd(projectedMonthlySpend)}
          </Text>
        </View>

        {payload.summary ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle} minPresenceAhead={40}>
              AI Summary
            </Text>
            <View style={styles.card}>
              <Text style={styles.text}>{payload.summary}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle} minPresenceAhead={36}>
            Top Opportunities
          </Text>
          <View style={styles.card}>
            {topThree.length > 0 ? (
              topThree.map((item, index) => (
                <View key={`${item.toolId}-${index}`} style={styles.listRow}>
                  <Text style={styles.cellText}>
                    {index + 1}. {TOOL_NAME_BY_ID[item.toolId] || item.toolId}
                  </Text>
                  <Text style={[styles.cellText, { fontWeight: 'bold' }]}>${formatUsd(item.monthlySavings)}/mo</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.text, styles.muted]}>
                No positive savings opportunities found in this report yet.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle} minPresenceAhead={30}>
            Action Mix
          </Text>
          <View style={styles.card}>
            <View style={styles.actionMixTrack}>
              {actionTotal > 0
                ? ACTION_ORDER.map((action) => {
                    const count = actionCounts[action];
                    if (count === 0) {
                      return null;
                    }

                    return (
                      <View
                        key={`action-segment-${action}`}
                        style={[
                          styles.actionMixSegment,
                          {
                            width: `${(count / actionTotal) * 100}%`,
                            backgroundColor: ACTION_COLORS[action],
                          },
                        ]}
                      />
                    );
                  })
                : null}
            </View>

            <View style={styles.actionMixLegendGrid}>
              {ACTION_ORDER.map((action) => (
                <View key={`action-legend-${action}`} style={styles.actionMixLegendItem}>
                  <View style={styles.actionMixLegendLeft}>
                    <View style={[styles.actionMixDot, { backgroundColor: ACTION_COLORS[action] }]} />
                    <Text style={styles.actionMixLegendLabel}>{action}</Text>
                  </View>
                  <Text style={styles.actionMixLegendCount}>{actionCounts[action]}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle} minPresenceAhead={48}>
            Visual Charts
          </Text>
          <View style={styles.chartGrid}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Spend Projection</Text>
              <View style={styles.chartRow}>
                <View style={styles.chartRowHeader}>
                  <Text style={styles.chartLabel}>Current</Text>
                  <Text style={styles.chartValue}>${formatUsd(currentMonthlySpend)}</Text>
                </View>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartBarCurrent, { width: '100%' }]} />
                </View>
              </View>
              <View style={styles.chartRow}>
                <View style={styles.chartRowHeader}>
                  <Text style={styles.chartLabel}>After recommendations</Text>
                  <Text style={styles.chartValue}>${formatUsd(projectedMonthlySpend)}</Text>
                </View>
                <View style={styles.chartTrack}>
                  <View
                    style={[
                      styles.chartBarProjected,
                      {
                        width: `${currentMonthlySpend > 0 ? Math.max(2, (projectedMonthlySpend / currentMonthlySpend) * 100) : 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Top Opportunities</Text>
              {topOpportunitiesForChart.length > 0 ? (
                topOpportunitiesForChart.map((item, index) => (
                  <View key={`${item.toolId}-chart-${index}`} style={styles.chartRow}>
                    <View style={styles.chartRowHeader}>
                      <Text style={styles.chartLabel}>
                        {TOOL_NAME_BY_ID[item.toolId] || item.toolId}
                      </Text>
                      <Text style={styles.chartValue}>${formatUsd(item.monthlySavings)}/mo</Text>
                    </View>
                    <View style={styles.chartTrack}>
                      <View
                        style={[
                          styles.chartBarOpportunity,
                          {
                            width: `${maxOpportunitySavings > 0 ? Math.max(8, (item.monthlySavings / maxOpportunitySavings) * 100) : 0}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[styles.text, styles.muted]}>
                  No positive savings opportunities yet.
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle} minPresenceAhead={52}>
            Current Stack
          </Text>
          <View style={styles.card}>
            <View style={styles.rowHeader}>
              <Text style={[styles.headerText, styles.colTool]}>Tool</Text>
              <Text style={[styles.headerText, styles.colPlan]}>Plan</Text>
              <Text style={[styles.headerText, styles.colSeats]}>Seats</Text>
              <Text style={[styles.headerText, styles.colMoney]}>Monthly Spend</Text>
            </View>
            {payload.tools.map((tool, index) => (
              <View
                key={`${tool.toolId}-${tool.planId}-${index}`}
                style={index === payload.tools.length - 1 ? [styles.row, styles.rowLast] : styles.row}
              >
                <Text style={[styles.cellText, styles.colTool]}>
                  {TOOL_NAME_BY_ID[tool.toolId] || tool.toolId}
                </Text>
                <Text style={[styles.cellText, styles.colPlan]}>{tool.planId}</Text>
                <Text style={[styles.cellText, styles.colSeats]}>{tool.seats}</Text>
                <Text style={[styles.cellText, styles.colMoney]}>${formatUsd(tool.monthlySpend)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle} minPresenceAhead={52}>
            Per-Tool Recommendations
          </Text>
          <View style={styles.card}>
            <View style={styles.rowHeader}>
              <View style={[styles.colTool, styles.cellBase]}>
                <Text style={styles.headerText}>Tool</Text>
              </View>
              <View style={[styles.recColAction, styles.cellBase]}>
                <Text style={styles.headerText}>Action</Text>
              </View>
              <View style={[styles.colMoney, styles.cellBase, styles.cellRight]}>
                <Text style={styles.headerText}>Savings/mo</Text>
              </View>
              <View style={[styles.recColReason, styles.reasonCell]}>
                <Text style={styles.headerText}>Reasoning</Text>
              </View>
            </View>
            {sortedRecommendations.map((recommendation, index) => (
              <View
                key={`${recommendation.toolId}-${recommendation.currentPlanId}-${index}`}
                style={index === sortedRecommendations.length - 1 ? [styles.row, styles.rowLast] : styles.row}
              >
                <View style={[styles.colTool, styles.cellBase]}>
                  <Text style={styles.cellText}>
                    {TOOL_NAME_BY_ID[recommendation.toolId] || recommendation.toolId}
                  </Text>
                </View>
                <View style={[styles.recColAction, styles.badgeWrap]}>
                  <Text style={styles.badge}>{formatAction(recommendation.recommendedAction)}</Text>
                </View>
                <View style={[styles.colMoney, styles.cellBase, styles.cellRight]}>
                  <Text style={styles.cellText} wrap={false}>
                    ${formatUsd(recommendation.monthlySavings)}
                  </Text>
                </View>
                <View style={[styles.recColReason, styles.reasonCell]}>
                  <Text style={styles.reasonText}>{recommendation.reasoning}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Spendly • AI Spend Audit</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(document);
}
