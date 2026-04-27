import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Header from '../../components/navbar';
import { tabs, transactionStatuses } from './constants';
import {
  acceptOrganizerTransaction,
  rejectOrganizerTransaction,
  updateOrganizerEvent,
} from '../../api/organizer-dashboard';
import type {
  OrganizerEventItem,
  OrganizerStatisticsData,
  OrganizerTransactionStatus,
} from '../../types/organizer-dashboard';
import type {
  DashboardTab,
  EditEventFormValues,
  StatsQuery,
} from './types';
import {
  formatIdr,
  getErrorMessage,
  toDateTimeLocal,
} from './utils';
import { editEventSchema } from './schema';
import { useOrganizerDashboardData } from './hooks/useOrganizerDashboardData';
import { EventsTab } from './components/EventsTab';
import { OverviewTab } from './components/OverviewTab';
import { EditEventModal } from './components/EditEventModal';
import { RatingsTab } from './components/RatingsTab';
import { TransactionsTab } from './components/TransactionsTab';
import { StatisticsTab } from './components/StatisticsTab';
import { AttendeesTab } from './components/AttendeesTab';

export default function OrganizerDashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isPageVisible, setIsPageVisible] = useState(false);
  const [isTabContentVisible, setIsTabContentVisible] = useState(false);
  const [isTabSkeletonVisible, setIsTabSkeletonVisible] = useState(false);
  const [shouldStaggerTabContent, setShouldStaggerTabContent] = useState(false);
  const hasMountedTabTransition = useRef(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<OrganizerEventItem | null>(null);
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<OrganizerTransactionStatus | 'ALL'>('PAID');
  const [transactionEventFilter, setTransactionEventFilter] = useState('');
  const [decisionReasonById, setDecisionReasonById] = useState<Record<string, string>>({});
  const [transactionActionLoadingId, setTransactionActionLoadingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const [statsQuery, setStatsQuery] = useState<StatsQuery>(() => {
    const now = new Date();
    return {
      groupBy: 'month',
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };
  });

  const [selectedAttendeeEventId, setSelectedAttendeeEventId] = useState('');

  const [selectedStatsEventId, setSelectedStatsEventId] = useState('');

  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const reportDashboardError = useCallback((message: string) => {
    setGlobalMessage({ type: 'error', text: message });
  }, []);

  const {
    overview,
    overviewLoading,
    events,
    eventsLoading,
    transactions,
    transactionsLoading,
    transactionMeta,
    statistics,
    statisticsLoading,
    attendees,
    attendeesLoading,
    ratings,
    ratingsLoading,
    avgRating,
    fetchOverview,
    fetchEvents,
    fetchTransactions,
    fetchStatistics,
    fetchAttendees,
    fetchRatings,
  } = useOrganizerDashboardData(reportDashboardError);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<EditEventFormValues>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      totalSeats: '',
      eventDate: '',
      startTime: '',
      endTime: '',
      location: '',
      city: '',
      discountType: 'NONE',
      discountValue: '',
      discountStart: '',
      discountEnd: '',
    },
  });

  const selectedDiscountType = watch('discountType');

  const overviewCards = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [
      { title: 'Total Event', value: overview.totalEvents.toString() },
      { title: 'Pending Verifikasi', value: overview.pendingPaymentVerifications.toString() },
      { title: 'Transaksi Selesai', value: overview.completedTransactions.toString() },
      { title: 'Total Tiket Terjual', value: overview.totalTicketsSold.toString() },
      { title: 'Total Revenue', value: formatIdr(overview.totalRevenue) },
    ];
  }, [overview]);

  const statisticCharts = useMemo(
    () => [
      {
        key: 'revenue',
        title: 'Revenue',
        description: 'Pendapatan event pada periode yang dipilih.',
        dataKey: 'revenue' as const,
        color: '#f59e0b',
        formatValue: (value: number) => formatIdr(value),
      },
      {
        key: 'ticketsSold',
        title: 'Ticket Sold',
        description: 'Jumlah tiket terjual pada periode yang dipilih.',
        dataKey: 'ticketsSold' as const,
        color: '#0284c7',
        formatValue: (value: number) => value.toString(),
      },
      {
        key: 'transactionCount',
        title: 'Transaction',
        description: 'Jumlah transaksi pada periode yang dipilih.',
        dataKey: 'transactionCount' as const,
        color: '#0f766e',
        formatValue: (value: number) => value.toString(),
      },
    ],
    []
  );

  const yearlyStatisticsTicks = useMemo(() => {
    if (!statistics || statistics.groupBy !== 'year') {
      return [] as number[];
    }

    let latestYear = statsQuery.year;
    if (statistics.series.length > 0) {
      latestYear = Math.max(...statistics.series.map((item) => item.bucket));
    }

    return Array.from({ length: 5 }, (_, index) => latestYear - 4 + index);
  }, [statistics, statsQuery.year]);

  const tabRevealClass = isTabContentVisible
    ? 'translate-y-0 opacity-100 blur-0'
    : 'translate-y-1 opacity-0 blur-[1px] pointer-events-none';

  const getItemStaggerClass = (index: number) => {
    const staggerClasses = [
      'dashboard-stagger-0',
      'dashboard-stagger-1',
      'dashboard-stagger-2',
      'dashboard-stagger-3',
      'dashboard-stagger-4',
      'dashboard-stagger-5',
    ];

    return staggerClasses[index % staggerClasses.length];
  };

  const getItemRevealClass = (index: number) => {
    const baseClasses = [
      'transition-all',
      'duration-700',
      'ease-[cubic-bezier(0.22,1,0.36,1)]',
      'will-change-transform',
    ];

    if (!shouldStaggerTabContent && isTabContentVisible) {
      return [...baseClasses, 'translate-y-0 opacity-100 blur-0'].join(' ');
    }

    return [
      ...baseClasses,
      getItemStaggerClass(index),
      isTabContentVisible ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-2 opacity-0 blur-[1.5px]',
    ].join(' ');
  };

  const visibleStatisticsSeries = useMemo(() => {
    if (!statistics) {
      return [] as OrganizerStatisticsData['series'];
    }

    if (statistics.groupBy === 'year') {
      let latestYear = statsQuery.year;
      if (statistics.series.length > 0) {
        latestYear = Math.max(...statistics.series.map((item) => item.bucket));
      }

      const minimumYear = latestYear - 4;

      if (statistics.series.length === 0) {
        // Generate dummy series for 5 years so axis ticks still display
        return Array.from({ length: 5 }, (_, index) => ({
          bucket: minimumYear + index,
          transactionCount: 0,
          ticketsSold: 0,
          revenue: 0,
        }));
      }

      const filtered = statistics.series
        .filter((item) => item.bucket >= minimumYear && item.bucket <= latestYear)
        .sort((left, right) => left.bucket - right.bucket);

      // Fill missing years with zeros if there are gaps
      const filledSeries: OrganizerStatisticsData['series'] = [];
      for (let year = minimumYear; year <= latestYear; year++) {
        const existing = filtered.find((item) => item.bucket === year);
        filledSeries.push(
          existing || {
            bucket: year,
            transactionCount: 0,
            ticketsSold: 0,
            revenue: 0,
          }
        );
      }

      return filledSeries;
    }

    if (statistics.groupBy === 'month') {
      if (statistics.series.length === 0) {
        // Generate dummy series for 12 months so axis ticks still display
        return Array.from({ length: 12 }, (_, index) => ({
          bucket: index + 1,
          transactionCount: 0,
          ticketsSold: 0,
          revenue: 0,
        }));
      }

      const sorted = statistics.series.sort((left, right) => left.bucket - right.bucket);

      // Fill missing months with zeros if there are gaps
      const filledSeries: OrganizerStatisticsData['series'] = [];
      for (let month = 1; month <= 12; month++) {
        const existing = sorted.find((item) => item.bucket === month);
        filledSeries.push(
          existing || {
            bucket: month,
            transactionCount: 0,
            ticketsSold: 0,
            revenue: 0,
          }
        );
      }

      return filledSeries;
    }

    // For day or other groupBy modes, return as-is
    return statistics.series;
  }, [statistics, statsQuery.year]);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsPageVisible(true);
    }, 60);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!hasMountedTabTransition.current) {
      hasMountedTabTransition.current = true;
      setIsTabContentVisible(true);
      setShouldStaggerTabContent(false);
      return;
    }

    setIsTabSkeletonVisible(true);
    setIsTabContentVisible(false);
    setShouldStaggerTabContent(true);

    const timeoutId = window.setTimeout(() => {
      setIsTabSkeletonVisible(false);
      setIsTabContentVisible(true);
      setShouldStaggerTabContent(false);
    }, 320);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeTab]);

  useEffect(() => {
    const now = new Date();

    void fetchOverview();
    void fetchEvents();
    void fetchTransactions({ page: 1, limit: 10 });
    void fetchStatistics({
      groupBy: 'month',
      year: now.getFullYear(),
    });
  }, [fetchEvents, fetchOverview, fetchStatistics, fetchTransactions]);

  useEffect(() => {
    if (!selectedAttendeeEventId && events.length > 0) {
      setSelectedAttendeeEventId(events[0].id);
    }
  }, [events, selectedAttendeeEventId]);

  useEffect(() => {
    if (selectedAttendeeEventId) {
      void fetchAttendees(selectedAttendeeEventId);
    }
  }, [fetchAttendees, selectedAttendeeEventId]);

  useEffect(() => {
    if (activeTab === 'ratings') {
      void fetchRatings();
    }
  }, [activeTab, fetchRatings]);

  const openEditModal = (event: OrganizerEventItem) => {
    setEditingEvent(event);

    reset({
      name: event.name,
      description: event.description ?? '',
      price: String(event.price),
      totalSeats: String(event.totalSeats),
      eventDate: toDateTimeLocal(event.eventDate),
      startTime: event.startTime ?? '',
      endTime: event.endTime ?? '',
      location: event.location ?? '',
      city: event.city ?? '',
      discountType: event.discountType ?? 'NONE',
      discountValue: event.discountValue ? String(event.discountValue) : '',
      discountStart: toDateTimeLocal(event.discountStart),
      discountEnd: toDateTimeLocal(event.discountEnd),
    });

    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingEvent(null);
  };

  const onSubmitEditEvent = async (value: EditEventFormValues) => {
    if (!editingEvent) {
      return;
    }

    try {
      const payload = {
        name: value.name.trim(),
        description: value.description.trim() ? value.description.trim() : null,
        price: Number(value.price),
        totalSeats: Number(value.totalSeats),
        eventDate: value.eventDate ? new Date(value.eventDate).toISOString() : null,
        startTime: value.startTime || null,
        endTime: value.endTime || null,
        location: value.location.trim() ? value.location.trim() : null,
        city: value.city.trim() ? value.city.trim() : null,
        discountType: value.discountType === 'NONE' ? null : value.discountType,
        discountValue:
          value.discountType === 'NONE' ? null : value.discountValue ? Number(value.discountValue) : null,
        discountStart:
          value.discountType === 'NONE' || !value.discountStart
            ? null
            : new Date(value.discountStart).toISOString(),
        discountEnd:
          value.discountType === 'NONE' || !value.discountEnd ? null : new Date(value.discountEnd).toISOString(),
      };

      await updateOrganizerEvent(editingEvent.id, payload);
      setGlobalMessage({ type: 'success', text: 'Event berhasil diperbarui' });
      closeEditModal();
      await fetchEvents();
    } catch (error) {
      setGlobalMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const handleTransactionDecision = async (transactionId: string, action: 'accept' | 'reject') => {
    try {
      setTransactionActionLoadingId(transactionId);
      const reason = decisionReasonById[transactionId]?.trim();

      if (action === 'accept') {
        await acceptOrganizerTransaction(transactionId, reason || undefined);
        setGlobalMessage({ type: 'success', text: 'Transaksi berhasil di-accept dan email notifikasi terkirim' });
      } else {
        await rejectOrganizerTransaction(transactionId, reason || undefined);
        setGlobalMessage({
          type: 'success',
          text: 'Transaksi di-reject. Seat, point, coupon, dan voucher otomatis di-rollback oleh backend.',
        });
      }

      await fetchOverview();
      await fetchTransactions({
        page: transactionMeta.page,
        limit: transactionMeta.limit,
        status: transactionStatusFilter === 'ALL' ? undefined : transactionStatusFilter,
        eventId: transactionEventFilter || undefined,
      });
      await fetchAttendees(selectedAttendeeEventId);
    } catch (error) {
      setGlobalMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setTransactionActionLoadingId(null);
    }
  };

  const heroRevealClass = isPageVisible ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-4 opacity-0 blur-[2px]';

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-white to-slate-50 text-slate-900">
      <style>
        {`
          .dashboard-skeleton-shimmer {
            position: relative;
            overflow: hidden;
            background-color: rgb(226 232 240);
          }

          .dashboard-skeleton-shimmer::after {
            content: '';
            position: absolute;
            inset: 0;
            transform: translateX(-100%);
            background-image: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.72) 45%, transparent 100%);
            animation: dashboardShimmer 1.6s ease-in-out infinite;
          }

          @keyframes dashboardShimmer {
            100% {
              transform: translateX(100%);
            }
          }

          .dashboard-stagger-0 { transition-delay: 80ms; }
          .dashboard-stagger-1 { transition-delay: 140ms; }
          .dashboard-stagger-2 { transition-delay: 200ms; }
          .dashboard-stagger-3 { transition-delay: 260ms; }
          .dashboard-stagger-4 { transition-delay: 320ms; }
          .dashboard-stagger-5 { transition-delay: 380ms; }
        `}
      </style>
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-700 ${heroRevealClass} sm:p-8`}>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-widest text-sky-600">Event Organizer Console</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Event Management Dashboard</h1>
              <p className="mt-2 text-sm text-slate-600">
                Kelola event, verifikasi transaksi, lihat statistik, dan cek attendee list dalam satu halaman.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void fetchOverview();
                void fetchEvents();
                void fetchTransactions({
                  page: transactionMeta.page,
                  limit: transactionMeta.limit,
                  status: transactionStatusFilter === 'ALL' ? undefined : transactionStatusFilter,
                  eventId: transactionEventFilter || undefined,
                });
                void fetchStatistics({
                  groupBy: statsQuery.groupBy,
                  year: statsQuery.groupBy === 'year' ? undefined : statsQuery.year,
                  month: statsQuery.groupBy === 'day' ? statsQuery.month : undefined,
                });
                void fetchAttendees(selectedAttendeeEventId);
              }}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Refresh Data
            </button>
          </div>

          {globalMessage && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                globalMessage.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {globalMessage.text}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab.id === activeTab
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === 'overview' && (
          <OverviewTab
            cards={overviewCards}
            isLoading={overviewLoading}
            isTabSkeletonVisible={isTabSkeletonVisible}
            tabRevealClass={tabRevealClass}
            getItemRevealClass={getItemRevealClass}
          />
        )}

        {activeTab === 'events' && (
          <EventsTab
            events={events}
            isLoading={eventsLoading}
            isTabSkeletonVisible={isTabSkeletonVisible}
            tabRevealClass={tabRevealClass}
            getItemRevealClass={getItemRevealClass}
            onReload={() => {
              void fetchEvents();
            }}
            onEditEvent={openEditModal}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            events={events}
            transactionStatuses={transactionStatuses}
            transactionStatusFilter={transactionStatusFilter}
            transactionEventFilter={transactionEventFilter}
            transactionMeta={transactionMeta}
            transactions={transactions}
            transactionsLoading={transactionsLoading}
            isTabSkeletonVisible={isTabSkeletonVisible}
            tabRevealClass={tabRevealClass}
            getItemRevealClass={getItemRevealClass}
            decisionReasonById={decisionReasonById}
            transactionActionLoadingId={transactionActionLoadingId}
            now={now}
            onTransactionStatusFilterChange={setTransactionStatusFilter}
            onTransactionEventFilterChange={setTransactionEventFilter}
            onApplyFilter={() => {
              void fetchTransactions({
                page: 1,
                limit: transactionMeta.limit,
                status: transactionStatusFilter === 'ALL' ? undefined : transactionStatusFilter,
                eventId: transactionEventFilter || undefined,
              });
            }}
            onDecisionReasonChange={(transactionId, reason) => {
              setDecisionReasonById((prev) => ({
                ...prev,
                [transactionId]: reason,
              }));
            }}
            onTransactionDecision={(transactionId, action) => {
              void handleTransactionDecision(transactionId, action);
            }}
            onPrevPage={() => {
              void fetchTransactions({
                page: transactionMeta.page - 1,
                limit: transactionMeta.limit,
                status: transactionStatusFilter === 'ALL' ? undefined : transactionStatusFilter,
                eventId: transactionEventFilter || undefined,
              });
            }}
            onNextPage={() => {
              void fetchTransactions({
                page: transactionMeta.page + 1,
                limit: transactionMeta.limit,
                status: transactionStatusFilter === 'ALL' ? undefined : transactionStatusFilter,
                eventId: transactionEventFilter || undefined,
              });
            }}
          />
        )}

        {activeTab === 'statistics' && (
          <StatisticsTab
            events={events}
            statsQuery={statsQuery}
            selectedStatsEventId={selectedStatsEventId}
            statistics={statistics}
            statisticsLoading={statisticsLoading}
            isTabSkeletonVisible={isTabSkeletonVisible}
            tabRevealClass={tabRevealClass}
            yearlyStatisticsTicks={yearlyStatisticsTicks}
            visibleStatisticsSeries={visibleStatisticsSeries}
            statisticCharts={statisticCharts}
            onStatsQueryChange={setStatsQuery}
            onSelectedStatsEventIdChange={setSelectedStatsEventId}
            onLoadChart={() => {
              void fetchStatistics({
                groupBy: statsQuery.groupBy,
                year: statsQuery.groupBy === 'year' ? undefined : statsQuery.year,
                month: statsQuery.groupBy === 'day' ? statsQuery.month : undefined,
                eventId: selectedStatsEventId || undefined,
              });
            }}
          />
        )}

        {activeTab === 'attendees' && (
          <AttendeesTab
            events={events}
            selectedAttendeeEventId={selectedAttendeeEventId}
            attendees={attendees}
            attendeesLoading={attendeesLoading}
            isTabSkeletonVisible={isTabSkeletonVisible}
            tabRevealClass={tabRevealClass}
            onSelectedAttendeeEventIdChange={setSelectedAttendeeEventId}
            onLoadAttendees={() => {
              void fetchAttendees(selectedAttendeeEventId);
            }}
          />
        )}

        {activeTab === 'ratings' && (
          <RatingsTab
            ratings={ratings}
            avgRating={avgRating}
            isLoading={ratingsLoading}
            isTabSkeletonVisible={isTabSkeletonVisible}
            tabRevealClass={tabRevealClass}
            getItemRevealClass={getItemRevealClass}
          />
        )}
      </main>

      <EditEventModal
        isOpen={editModalOpen && Boolean(editingEvent)}
        selectedDiscountType={selectedDiscountType}
        register={register}
        errors={errors}
        isSubmitting={isSubmitting}
        onClose={closeEditModal}
        handleSubmit={handleSubmit}
        onSubmit={onSubmitEditEvent}
      />
    </div>
  );
}