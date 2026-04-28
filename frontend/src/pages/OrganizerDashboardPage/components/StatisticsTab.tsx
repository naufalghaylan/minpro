import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  OrganizerEventItem,
  OrganizerStatisticsData,
  OrganizerStatisticsGroupBy,
} from '../../../types/organizer-dashboard';
import type { StatsQuery } from '../types';

type StatisticChartConfig = {
  key: string;
  title: string;
  description: string;
  dataKey: 'revenue' | 'ticketsSold' | 'transactionCount';
  color: string;
  formatValue: (value: number) => string;
};

type StatisticsTabProps = {
  events: OrganizerEventItem[];
  statsQuery: StatsQuery;
  selectedStatsEventId: string;
  statistics: OrganizerStatisticsData | null;
  statisticsLoading: boolean;
  isTabSkeletonVisible: boolean;
  tabRevealClass: string;
  yearlyStatisticsTicks: number[];
  visibleStatisticsSeries: OrganizerStatisticsData['series'];
  statisticCharts: StatisticChartConfig[];
  onStatsQueryChange: (next: StatsQuery) => void;
  onSelectedStatsEventIdChange: (eventId: string) => void;
  onLoadChart: () => void;
};

export function StatisticsTab({
  events,
  statsQuery,
  selectedStatsEventId,
  statistics,
  statisticsLoading,
  isTabSkeletonVisible,
  tabRevealClass,
  yearlyStatisticsTicks,
  visibleStatisticsSeries,
  statisticCharts,
  onStatsQueryChange,
  onSelectedStatsEventIdChange,
  onLoadChart,
}: StatisticsTabProps) {
  return (
    <section
      className={`mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-500 delay-200 ${tabRevealClass} sm:p-6`}
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h2 className="text-xl font-bold text-slate-900">Statistics Visualization</h2>

        <div className="grid gap-2 sm:grid-cols-4">
          <label className="text-sm text-slate-600">
            Group By
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={statsQuery.groupBy}
              onChange={(event) =>
                onStatsQueryChange({
                  ...statsQuery,
                  groupBy: event.target.value as OrganizerStatisticsGroupBy,
                })
              }
            >
              <option value="year">Year</option>
              <option value="month">Month</option>
              <option value="day">Day</option>
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Year
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={statsQuery.year}
              onChange={(event) =>
                onStatsQueryChange({
                  ...statsQuery,
                  year: Number(event.target.value),
                })
              }
              disabled={statsQuery.groupBy === 'year'}
            />
          </label>

          <label className="text-sm text-slate-600">
            Month
            <input
              type="number"
              min={1}
              max={12}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={statsQuery.month}
              onChange={(event) =>
                onStatsQueryChange({
                  ...statsQuery,
                  month: Number(event.target.value),
                })
              }
              disabled={statsQuery.groupBy !== 'day'}
            />
          </label>

          <label className="text-sm text-slate-600">
            Event
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={selectedStatsEventId}
              onChange={(event) => {
                onSelectedStatsEventIdChange(event.target.value);
              }}
            >
              <option value="">Semua Event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onLoadChart}
            className="h-10.5 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Load Chart
          </button>
        </div>
      </div>

      {(statisticsLoading || isTabSkeletonVisible) && (
        <div className="h-96 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-full w-full items-end justify-between gap-2 rounded-lg bg-white px-4 py-3">
            <div className="h-20 w-8 rounded-md dashboard-skeleton-shimmer" />
            <div className="h-36 w-8 rounded-md dashboard-skeleton-shimmer" />
            <div className="h-28 w-8 rounded-md dashboard-skeleton-shimmer" />
            <div className="h-44 w-8 rounded-md dashboard-skeleton-shimmer" />
            <div className="h-24 w-8 rounded-md dashboard-skeleton-shimmer" />
            <div className="h-40 w-8 rounded-md dashboard-skeleton-shimmer" />
            <div className="h-32 w-8 rounded-md dashboard-skeleton-shimmer" />
          </div>
        </div>
      )}

      {!statisticsLoading && !isTabSkeletonVisible && statistics && statistics.series.length === 0 && (
        <p className="text-sm text-slate-500">Belum ada data statistik DONE untuk filter ini.</p>
      )}

      {!statisticsLoading && !isTabSkeletonVisible && statistics && statistics.series.length > 0 && (
        <div className="grid gap-4">
          {statisticCharts.map((chart) => (
            <article key={chart.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">{chart.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{chart.description}</p>
              </div>

              <div className="h-80 rounded-xl bg-white p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visibleStatisticsSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="bucket"
                      tickLine={false}
                      axisLine={false}
                      ticks={statistics?.groupBy === 'year' ? yearlyStatisticsTicks : undefined}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value) => {
                        const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                        return [chart.formatValue(numericValue), chart.title];
                      }}
                    />
                    <Bar
                      dataKey={chart.dataKey}
                      name={chart.title}
                      fill={chart.color}
                      radius={[8, 8, 0, 0]}
                      barSize={visibleStatisticsSeries.length <= 1 ? 32 : 28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}