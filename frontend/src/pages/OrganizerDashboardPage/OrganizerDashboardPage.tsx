import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api';
import { useAuthStore } from '../../store/auth';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { isAxiosError } from 'axios';
import Header from '../../components/navbar';
import {
  acceptOrganizerTransaction,
  getOrganizerAttendees,
  getOrganizerEvents,
  getOrganizerOverview,
  getOrganizerStatistics,
  getOrganizerTransactions,
  rejectOrganizerTransaction,
  updateOrganizerEvent,
} from '../../api/organizer-dashboard';
import type {
  OrganizerAttendeeItem,
  OrganizerDashboardOverview,
  OrganizerEventItem,
  OrganizerStatisticsData,
  OrganizerStatisticsGroupBy,
  OrganizerTransactionItem,
  OrganizerTransactionStatus,
} from '../../types/organizer-dashboard';

type DashboardTab =
  | 'overview'
  | 'events'
  | 'transactions'
  | 'statistics'
  | 'attendees'
  | 'ratings'; 

type StatsQuery = {
  groupBy: OrganizerStatisticsGroupBy;
  year: number;
  month: number;
};

type EditEventFormValues = {
  name: string;
  description: string;
  price: string;
  totalSeats: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  city: string;
  discountType: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue: string;
  discountStart: string;
  discountEnd: string;
};
interface RatingItem {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: {
    name: string;
  };
  event: {
    name: string;
  };
}



const tabs: Array<{ id: DashboardTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'events', label: 'Manage Events' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'attendees', label: 'Attendee List' },
  { id: 'ratings', label: 'Ratings ⭐' },
];

const transactionStatuses: Array<OrganizerTransactionStatus | 'ALL'> = [
  'ALL',
  'PAID',
  'DONE',
  'PENDING',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
];

const editEventSchema = z
  .object({
    name: z.string().trim().min(3, 'Nama event minimal 3 karakter'),
    description: z.string(),
    price: z
      .string()
      .trim()
      .regex(/^\d+$/, 'Harga harus berupa angka'),
    totalSeats: z
      .string()
      .trim()
      .regex(/^\d+$/, 'Total kursi harus berupa angka')
      .refine((value) => Number(value) >= 1, 'Total kursi minimal 1'),
    eventDate: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    location: z.string(),
    city: z.string(),
    discountType: z.enum(['NONE', 'PERCENT', 'FIXED']),
    discountValue: z.string(),
    discountStart: z.string(),
    discountEnd: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.discountType === 'NONE') {
      return;
    }

    if (!value.discountValue || !/^\d+$/.test(value.discountValue) || Number(value.discountValue) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nilai diskon wajib diisi dan harus lebih dari 0',
        path: ['discountValue'],
      });
    }

    if (!value.discountStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tanggal mulai diskon wajib diisi',
        path: ['discountStart'],
      });
    }

    if (!value.discountEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tanggal akhir diskon wajib diisi',
        path: ['discountEnd'],
      });
    }
  });

const formatIdr = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const toDateTimeLocal = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getErrorMessage = (error: unknown) => {
  if (isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) {
      return apiMessage;
    }
  }

  return 'Terjadi kesalahan. Coba lagi.';
};

const getDecisionCountdown = (paidAt?: string | null, currentTime?: number) => {
  if (!paidAt) return null;

  const now = currentTime || Date.now();
  const paid = new Date(paidAt).getTime();
  const deadline = paid + 48 * 60 * 60 * 1000; // 48 hours in milliseconds
  const remaining = deadline - now;

  if (remaining <= 0) return 'Waktu habis';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  return `${hours}j ${minutes}m ${seconds}s`;
};

export default function OrganizerDashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [isPageVisible, setIsPageVisible] = useState(false);
  const [isTabContentVisible, setIsTabContentVisible] = useState(false);
  const [isTabSkeletonVisible, setIsTabSkeletonVisible] = useState(false);
  const [shouldStaggerTabContent, setShouldStaggerTabContent] = useState(false);
  const hasMountedTabTransition = useRef(false);

  const [overview, setOverview] = useState<OrganizerDashboardOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [events, setEvents] = useState<OrganizerEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<OrganizerEventItem | null>(null);

  const [transactions, setTransactions] = useState<OrganizerTransactionItem[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionMeta, setTransactionMeta] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
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
  const [statistics, setStatistics] = useState<OrganizerStatisticsData | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  const [selectedAttendeeEventId, setSelectedAttendeeEventId] = useState('');
  const [attendees, setAttendees] = useState<OrganizerAttendeeItem[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  const [selectedStatsEventId, setSelectedStatsEventId] = useState('');
  // 🔥 RATING STATE
const [ratings, setRatings] = useState<RatingItem[]>([]);
const [ratingsLoading, setRatingsLoading] = useState(false);
const [avgRating, setAvgRating] = useState(0);

  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

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

  const fetchOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const data = await getOrganizerOverview();
      setOverview(data);
    } catch (error) {
      setGlobalMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setEventsLoading(true);
      const data = await getOrganizerEvents();
      setEvents(data);

      setSelectedAttendeeEventId((currentEventId) =>
        !currentEventId && data.length > 0 ? data[0].id : currentEventId
      );
    } catch (error) {
      setGlobalMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(
    async ({
      page = 1,
      limit = 10,
      status,
      eventId,
    }: {
      page?: number;
      limit?: number;
      status?: OrganizerTransactionStatus;
      eventId?: string;
    } = {}) => {
    try {
      setTransactionsLoading(true);
      const result = await getOrganizerTransactions({
        status,
        eventId,
        page,
        limit,
      });
      setTransactions(result.data);
      setTransactionMeta(result.meta);
    } catch (error) {
      setGlobalMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setTransactionsLoading(false);
    }
    },
    []
  );

  const fetchStatistics = useCallback(
    async ({
      groupBy,
      year,
      month,
      eventId,
    }: {
      groupBy: OrganizerStatisticsGroupBy;
      year?: number;
      month?: number;
      eventId?: string;
    }) => {
    try {
      setStatisticsLoading(true);
      const data = await getOrganizerStatistics({
        groupBy,
        year,
        month,
        eventId,
      });
      setStatistics(data);
    } catch (error) {
      setGlobalMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setStatisticsLoading(false);
    }
    },
    []
  );

  const fetchAttendees = useCallback(async (eventId?: string) => {
    if (!eventId) {
      setAttendees([]);
      return;
    }

    try {
      setAttendeesLoading(true);
      const data = await getOrganizerAttendees(eventId);
      setAttendees(data);
    } catch (error) {
      setGlobalMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setAttendeesLoading(false);
    }
  }, []);
const fetchRatings = useCallback(async () => {
  try {
    setRatingsLoading(true);

    const token = useAuthStore.getState().token;

    let res: { data: RatingItem[] | { data: RatingItem[] } } | null = null;
    const endpointCandidates = ['/api/ratings/organizer', '/ratings/organizer'];

    for (const endpoint of endpointCandidates) {
      try {
        res = await api.get<RatingItem[] | { data: RatingItem[] }>(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        break;
      } catch (error) {
        if (!isAxiosError(error) || error.response?.status !== 404) {
          throw error;
        }
      }
    }

    if (!res) {
      throw new Error('Ratings endpoint not found');
    }

    const data = Array.isArray(res.data) ? res.data : res.data.data;

    setRatings(data);

    if (data.length > 0) {
      const avg = data.reduce((acc, item) => acc + item.rating, 0) / data.length;

      setAvgRating(Number(avg.toFixed(1)));
    } else {
      setAvgRating(0);
    }

  } catch (error) {
    setGlobalMessage({ type: 'error', text: getErrorMessage(error) });
  } finally {
    setRatingsLoading(false);
  }
}, []);
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

    return () => window.clearTimeout(timeoutId);
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
    if (selectedAttendeeEventId) {
      void fetchAttendees(selectedAttendeeEventId);
    }
  }, [fetchAttendees, selectedAttendeeEventId]);
  useEffect(() => {
  if (activeTab === "ratings") {
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
  const tabRevealClass = isTabContentVisible
    ? 'translate-y-0 opacity-100 blur-0'
    : 'translate-y-2 opacity-0 blur-[3px] pointer-events-none';
  const getItemStaggerClass = (index: number) => {
    const staggerClasses = [
      'dashboard-stagger-0',
      'dashboard-stagger-1  ',
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
      'duration-500',
      'ease-out',
    ];

    // Jika shouldStaggerTabContent false dan isTabContentVisible true,
    // langsung visible tanpa stagger
    if (!shouldStaggerTabContent && isTabContentVisible) {
      return [...baseClasses, 'translate-y-0 opacity-100 blur-0'].join(' ');
    }

    // Jika shouldStaggerTabContent true, apply stagger
    return [
      ...baseClasses,
      getItemStaggerClass(index),
      isTabContentVisible ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-3 opacity-0 blur-[2px]',
    ].join(' ');
  };

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
            animation: dashboardShimmer 1.35s ease-in-out infinite;
          }

          @keyframes dashboardShimmer {
            100% {
              transform: translateX(100%);
            }
          }

          .dashboard-stagger-0 { transition-delay: 110ms; }
          .dashboard-stagger-1 { transition-delay: 170ms; }
          .dashboard-stagger-2 { transition-delay: 230ms; }
          .dashboard-stagger-3 { transition-delay: 290ms; }
          .dashboard-stagger-4 { transition-delay: 350ms; }
          .dashboard-stagger-5 { transition-delay: 410ms; }
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
          <section className={`mt-6 grid gap-4 transition-all duration-500 delay-75 sm:grid-cols-2 lg:grid-cols-3 ${tabRevealClass}`}>
            {(overviewLoading || isTabSkeletonVisible) && (
              <div className="col-span-full grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`overview-skeleton-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="h-3 w-24 rounded dashboard-skeleton-shimmer" />
                    <div className="mt-3 h-8 w-28 rounded dashboard-skeleton-shimmer" />
                  </div>
                ))}
              </div>
            )}

            {!overviewLoading && !isTabSkeletonVisible &&
              overviewCards.map((item, index) => (
                <article
                  key={item.title}
                  className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md ${getItemRevealClass(index)}`}
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.title}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                </article>
              ))}
          </section>
        )}

        {activeTab === 'events' && (
          <section
            className={`mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-500 delay-100 ${tabRevealClass} sm:p-6`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Daftar Event Organizer</h2>
              <button
                type="button"
                onClick={() => {
                  void fetchEvents();
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Reload Events
              </button>
            </div>

            {(eventsLoading || isTabSkeletonVisible) && (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`events-skeleton-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="h-5 w-40 rounded dashboard-skeleton-shimmer" />
                    <div className="mt-2 h-3 w-32 rounded dashboard-skeleton-shimmer" />
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="h-14 rounded-lg dashboard-skeleton-shimmer" />
                        <div className="h-14 rounded-lg dashboard-skeleton-shimmer" />
                        <div className="h-14 rounded-lg dashboard-skeleton-shimmer" />
                        <div className="h-14 rounded-lg dashboard-skeleton-shimmer" />
                      </div>
                  </div>
                ))}
              </div>
            )}

            {!eventsLoading && !isTabSkeletonVisible && events.length === 0 && (
              <p className="text-sm text-slate-500">Belum ada event untuk organizer ini.</p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {!isTabSkeletonVisible && events.map((event, index) => (
                <article
                  key={event.id}
                  className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-sky-200 ${getItemRevealClass(index)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{event.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {event.city || '-'} • {formatDateTime(event.eventDate)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditModal(event)}
                      className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                    >
                      Edit Event
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-slate-500">Harga</p>
                      <p className="font-semibold text-slate-900">{formatIdr(event.price)}</p>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-slate-500">Orders</p>
                      <p className="font-semibold text-slate-900">{event._count?.orders ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-slate-500">Total Seats</p>
                      <p className="font-semibold text-slate-900">{event.totalSeats}</p>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-slate-500">Available</p>
                      <p className="font-semibold text-slate-900">{event.availableSeats}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'transactions' && (
          <section
            className={`mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-500 delay-150 ${tabRevealClass} sm:p-6`}
          >
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <h2 className="text-xl font-bold text-slate-900">Transaction Management</h2>

              <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
                <label className="flex flex-col text-sm text-slate-600">
                  Status
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={transactionStatusFilter}
                    onChange={(event) => {
                      const next = event.target.value as OrganizerTransactionStatus | 'ALL';
                      setTransactionStatusFilter(next);
                    }}
                  >
                    {transactionStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col text-sm text-slate-600">
                  Event
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    value={transactionEventFilter}
                    onChange={(event) => {
                      setTransactionEventFilter(event.target.value);
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
                  onClick={() => {
                    void fetchTransactions({
                      page: 1,
                      limit: transactionMeta.limit,
                      status: transactionStatusFilter === 'ALL' ? undefined : transactionStatusFilter,
                      eventId: transactionEventFilter || undefined,
                    });
                  }}
                  className="self-end rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Apply Filter
                </button>
              </div>
            </div>

            {(transactionsLoading || isTabSkeletonVisible) && (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`transactions-skeleton-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="h-4 w-48 rounded dashboard-skeleton-shimmer" />
                    <div className="mt-2 h-3 w-64 rounded dashboard-skeleton-shimmer" />
                    <div className="mt-2 h-3 w-52 rounded dashboard-skeleton-shimmer" />
                    <div className="mt-4 h-28 rounded-xl dashboard-skeleton-shimmer" />
                  </div>
                ))}
              </div>
            )}

            {!transactionsLoading && !isTabSkeletonVisible && transactions.length === 0 && (
              <p className="text-sm text-slate-500">Tidak ada transaksi sesuai filter.</p>
            )}

            <div className="grid gap-4">
              {!isTabSkeletonVisible && transactions.map((transaction, index) => (
                <article
                  key={transaction.id}
                  className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 ${getItemRevealClass(index)}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-semibold">Transaction:</span> {transaction.id}
                      </p>
                      <p>
                        <span className="font-semibold">Event:</span> {transaction.order.event.name}
                      </p>
                      <p>
                        <span className="font-semibold">Customer:</span> {transaction.user.name} ({transaction.user.email})
                      </p>
                      <p>
                        <span className="font-semibold">Qty:</span> {transaction.order.quantity}
                      </p>
                      <p>
                        <span className="font-semibold">Total:</span> {formatIdr(transaction.totalAmount)}
                      </p>
                      <p>
                        <span className="font-semibold">Status:</span> {transaction.status}
                      </p>
                    </div>

                    <div className="w-full max-w-xs">
                      {transaction.paymentProofUrl ? (
                        <a href={transaction.paymentProofUrl} target="_blank" rel="noreferrer">
                          <img
                            src={transaction.paymentProofUrl}
                            alt="Payment proof"
                            className="h-36 w-full rounded-xl border border-slate-200 object-cover"
                          />
                        </a>
                      ) : (
                        <div className="flex h-36 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-xs text-slate-500">
                          Bukti pembayaran tidak tersedia
                        </div>
                      )}
                    </div>
                  </div>

                  {transaction.status === 'PAID' && (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      {/* Countdown Timer */}
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm font-semibold text-amber-800">
                          ⏰ Sisa waktu untuk keputusan: {getDecisionCountdown(transaction.paidAt, now)}
                        </p>
                      </div>

                      <label className="block text-sm text-slate-600">
                        Catatan keputusan (opsional)
                        <textarea
                          className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2"
                          value={decisionReasonById[transaction.id] || ''}
                          onChange={(event) =>
                            setDecisionReasonById((prev) => ({
                              ...prev,
                              [transaction.id]: event.target.value,
                            }))
                          }
                          placeholder="Contoh: Bukti pembayaran valid"
                        />
                      </label>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={transactionActionLoadingId === transaction.id}
                          onClick={() => {
                            void handleTransactionDecision(transaction.id, 'accept');
                          }}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Accept + Kirim Email
                        </button>
                        <button
                          type="button"
                          disabled={transactionActionLoadingId === transaction.id}
                          onClick={() => {
                            void handleTransactionDecision(transaction.id, 'reject');
                          }}
                          className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reject + Rollback + Email
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>

            {!isTabSkeletonVisible && (
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <button
                type="button"
                disabled={transactionMeta.page <= 1 || transactionsLoading}
                onClick={() => {
                  void fetchTransactions({
                    page: transactionMeta.page - 1,
                    limit: transactionMeta.limit,
                    status: transactionStatusFilter === 'ALL' ? undefined : transactionStatusFilter,
                    eventId: transactionEventFilter || undefined,
                  });
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <p className="text-slate-600">
                Page {transactionMeta.page} / {transactionMeta.totalPages} ({transactionMeta.total} transaksi)
              </p>
              <button
                type="button"
                disabled={transactionMeta.page >= transactionMeta.totalPages || transactionsLoading}
                onClick={() => {
                  void fetchTransactions({
                    page: transactionMeta.page + 1,
                    limit: transactionMeta.limit,
                    status: transactionStatusFilter === 'ALL' ? undefined : transactionStatusFilter,
                    eventId: transactionEventFilter || undefined,
                  });
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'statistics' && (
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
                      setStatsQuery((prev) => ({
                        ...prev,
                        groupBy: event.target.value as OrganizerStatisticsGroupBy,
                      }))
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
                      setStatsQuery((prev) => ({
                        ...prev,
                        year: Number(event.target.value),
                      }))
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
                      setStatsQuery((prev) => ({
                        ...prev,
                        month: Number(event.target.value),
                      }))
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
                      setSelectedStatsEventId(event.target.value);
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
                  onClick={() => {
                    void fetchStatistics({
                      groupBy: statsQuery.groupBy,
                      year: statsQuery.groupBy === 'year' ? undefined : statsQuery.year,
                      month: statsQuery.groupBy === 'day' ? statsQuery.month : undefined,
                      eventId: selectedStatsEventId || undefined,
                    });
                  }}
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
        )}

        {activeTab === 'attendees' && (
          <section
            className={`mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-500 delay-200 ${tabRevealClass} sm:p-6`}
          >
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <h2 className="text-xl font-bold text-slate-900">Attendee List</h2>

              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  aria-label="Pilih event attendee"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedAttendeeEventId}
                  onChange={(event) => setSelectedAttendeeEventId(event.target.value)}
                >
                  <option value="">Pilih Event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    void fetchAttendees(selectedAttendeeEventId);
                  }}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Load Attendees
                </button>
              </div>
            </div>

            {(attendeesLoading || isTabSkeletonVisible) && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <div className="min-w-full divide-y divide-slate-200 bg-white">
                  <div className="grid grid-cols-5 gap-3 bg-slate-50 px-3 py-2">
                    <div className="h-3 rounded dashboard-skeleton-shimmer" />
                    <div className="h-3 rounded dashboard-skeleton-shimmer" />
                    <div className="h-3 rounded dashboard-skeleton-shimmer" />
                    <div className="h-3 rounded dashboard-skeleton-shimmer" />
                    <div className="h-3 rounded dashboard-skeleton-shimmer" />
                  </div>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`attendees-skeleton-${index}`} className="grid grid-cols-5 gap-3 px-3 py-3">
                      <div className="h-4 rounded dashboard-skeleton-shimmer" />
                      <div className="h-4 rounded dashboard-skeleton-shimmer" />
                      <div className="h-4 rounded dashboard-skeleton-shimmer" />
                      <div className="h-4 rounded dashboard-skeleton-shimmer" />
                      <div className="h-4 rounded dashboard-skeleton-shimmer" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!attendeesLoading && !isTabSkeletonVisible && attendees.length === 0 && (
              <p className="text-sm text-slate-500">Belum ada attendee untuk event ini.</p>
            )}

            {!attendeesLoading && !isTabSkeletonVisible && attendees.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700">Nama</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Email</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Qty Ticket</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Total Dibayar</th>
                      <th className="px-3 py-2 font-semibold text-slate-700">Tanggal Beli</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {attendees.map((attendee) => (
                      <tr key={attendee.transactionId}>
                        <td className="px-3 py-2 text-slate-800">{attendee.customerName}</td>
                        <td className="px-3 py-2 text-slate-600">{attendee.customerEmail}</td>
                        <td className="px-3 py-2 text-slate-800">{attendee.ticketQuantity}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{formatIdr(attendee.totalPricePaid)}</td>
                        <td className="px-3 py-2 text-slate-600">{formatDateTime(attendee.purchasedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {editModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-3 py-6">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Edit Event</h3>
                <p className="text-sm text-slate-500">Perubahan event harus sesuai business rules backend.</p>
              </div>
              <button type="button" onClick={closeEditModal} className="text-sm font-semibold text-slate-500">
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitEditEvent)} className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                Nama Event
                <input {...register('name')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
              </label>

              <label className="text-sm text-slate-700">
                Harga
                <input
                  {...register('price')}
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                {errors.price && <p className="mt-1 text-xs text-rose-600">{errors.price.message}</p>}
              </label>

              <label className="text-sm text-slate-700">
                Total Seats
                <input
                  {...register('totalSeats')}
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                {errors.totalSeats && <p className="mt-1 text-xs text-rose-600">{errors.totalSeats.message}</p>}
              </label>

              <label className="text-sm text-slate-700">
                Event Date
                <input
                  {...register('eventDate')}
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm text-slate-700">
                Start Time
                <input
                  {...register('startTime')}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="09:00"
                />
              </label>

              <label className="text-sm text-slate-700">
                End Time
                <input
                  {...register('endTime')}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="17:00"
                />
              </label>

              <label className="text-sm text-slate-700">
                Location
                <input {...register('location')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>

              <label className="text-sm text-slate-700">
                City
                <input {...register('city')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Description
                <textarea
                  {...register('description')}
                  className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm text-slate-700">
                Discount Type
                <select
                  {...register('discountType')}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="NONE">No Discount</option>
                  <option value="PERCENT">Percent</option>
                  <option value="FIXED">Fixed</option>
                </select>
              </label>

              <label className="text-sm text-slate-700">
                Discount Value
                <input
                  {...register('discountValue')}
                  type="number"
                  disabled={selectedDiscountType === 'NONE'}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                />
                {errors.discountValue && <p className="mt-1 text-xs text-rose-600">{errors.discountValue.message}</p>}
              </label>

              <label className="text-sm text-slate-700">
                Discount Start
                <input
                  {...register('discountStart')}
                  type="datetime-local"
                  disabled={selectedDiscountType === 'NONE'}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                />
                {errors.discountStart && <p className="mt-1 text-xs text-rose-600">{errors.discountStart.message}</p>}
              </label>

              <label className="text-sm text-slate-700">
                Discount End
                <input
                  {...register('discountEnd')}
                  type="datetime-local"
                  disabled={selectedDiscountType === 'NONE'}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                />
                {errors.discountEnd && <p className="mt-1 text-xs text-rose-600">{errors.discountEnd.message}</p>}
              </label>

              <div className="md:col-span-2 flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
      )}
{activeTab === 'ratings' && (
  <section className={`mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-500 delay-200 ${tabRevealClass}`}>
    
    {/* HEADER */}
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold">Ratings ⭐</h2>

      <div className="text-sm text-slate-600">
        Avg:
        <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-600 rounded-lg font-semibold">
          {avgRating.toFixed(1)}
        </span>
      </div>
    </div>

    {(ratingsLoading || isTabSkeletonVisible) && (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`ratings-skeleton-${index}`} className="rounded-xl border bg-slate-50 p-4">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 w-32 rounded dashboard-skeleton-shimmer" />
                  <div className="mt-2 h-3 w-24 rounded dashboard-skeleton-shimmer" />
                </div>
                <div className="h-3 w-16 rounded dashboard-skeleton-shimmer" />
              </div>
              <div className="mt-3 h-3 w-40 rounded dashboard-skeleton-shimmer" />
              <div className="mt-3 h-4 w-full rounded dashboard-skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    )}

    {!ratingsLoading && !isTabSkeletonVisible && ratings.length === 0 && (
      <p className="text-sm text-slate-500">Belum ada review</p>
    )}

    {!ratingsLoading && !isTabSkeletonVisible && ratings.length > 0 && (
      <div className="space-y-3">
        {ratings.map((r, index) => (
          <div
            key={r.id}
            className={`p-4 border rounded-xl hover:shadow-md bg-slate-50 ${getItemRevealClass(index)}`}
          >
            {/* TOP */}
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800">
                  {r.user?.name || "User"}
                </p>
                <p className="text-xs text-slate-500">
                  {r.event?.name || "Event"}
                </p>
              </div>

              <div className="text-xs text-slate-400">
                {new Date(r.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* RATING */}
            <div className="mt-2 flex items-center gap-1 text-yellow-500">
              {"★".repeat(r.rating)}
              {"☆".repeat(5 - r.rating)}
              <span className="ml-2 text-sm text-slate-600">
                ({r.rating})
              </span>
            </div>

            {/* COMMENT */}
            <p className="mt-2 text-sm text-slate-700">
              {r.comment || "Tidak ada komentar"}
            </p>
          </div>
        ))}
      </div>
    )}
  </section>
)}
    </div>
  );
}