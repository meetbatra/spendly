'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type SpendProjectionChartProps = {
  currentMonthlySpend: number;
  projectedMonthlySpend: number;
};

type TopOpportunity = {
  toolName: string;
  monthlySavings: number;
};

type TopOpportunitiesChartProps = {
  opportunities: TopOpportunity[];
};

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function tooltipContainerStyle() {
  return {
    backgroundColor: '#111111',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: '#f5f5f5',
    fontSize: '12px',
  };
}

type SpendProjectionTooltipProps = {
  active?: boolean;
  label?: string;
  currentMonthlySpend: number;
  projectedMonthlySpend: number;
};

function SpendProjectionTooltip({
  active,
  label,
  currentMonthlySpend,
  projectedMonthlySpend,
}: SpendProjectionTooltipProps) {
  if (!active) {
    return null;
  }

  const isCurrent = label === 'Current';
  const value = isCurrent ? currentMonthlySpend : projectedMonthlySpend;
  const title = isCurrent ? 'Current' : 'After';

  return (
    <div style={tooltipContainerStyle()}>
      <div style={{ padding: '10px 12px' }}>
        <p style={{ margin: 0, color: '#C4C4C7', fontSize: 12 }}>{title}</p>
        <p style={{ margin: '6px 0 0', color: '#007affd9', fontSize: 12 }}>
          <strong>${formatUsd(value)}</strong>
        </p>
      </div>
    </div>
  );
}

export function SpendProjectionChart({
  currentMonthlySpend,
  projectedMonthlySpend,
}: SpendProjectionChartProps) {
  const data = [
    { name: 'Current', amount: currentMonthlySpend },
    { name: 'After', amount: projectedMonthlySpend },
  ];

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
          <XAxis dataKey="name" tick={{ fill: '#A1A1AA', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(value) => `$${value}`}
            tick={{ fill: '#A1A1AA', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={
              <SpendProjectionTooltip
                currentMonthlySpend={currentMonthlySpend}
                projectedMonthlySpend={projectedMonthlySpend}
              />
            }
            cursor={{ fill: 'rgba(0,122,255,0.10)' }}
          />
          <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
            <Cell fill="rgba(255,255,255,0.35)" />
            <Cell fill="rgba(0,122,255,0.85)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopOpportunitiesChart({ opportunities }: TopOpportunitiesChartProps) {
  const data = opportunities.map((item) => ({
    toolName: item.toolName.length > 14 ? `${item.toolName.slice(0, 14)}...` : item.toolName,
    monthlySavings: item.monthlySavings,
    fullToolName: item.toolName,
  }));

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
          <XAxis
            dataKey="toolName"
            tick={{ fill: '#A1A1AA', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => `$${value}`}
            tick={{ fill: '#A1A1AA', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value) => [`$${formatUsd(Number(value))}/mo`, 'Savings']}
            labelFormatter={(label, payload) =>
              payload?.[0]?.payload?.fullToolName ? payload[0].payload.fullToolName : label
            }
            contentStyle={tooltipContainerStyle()}
            cursor={{ fill: 'rgba(0,122,255,0.10)' }}
          />
          <Bar dataKey="monthlySavings" fill="rgba(0,122,255,0.85)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
