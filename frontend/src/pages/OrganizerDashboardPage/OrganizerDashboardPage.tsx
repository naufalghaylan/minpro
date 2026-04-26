import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../api';
import { useAuthStore } from '../../store/auth';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

export default function OrganizerDashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

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
    }: {
      groupBy: OrganizerStatisticsGroupBy;
      year?: number;
      month?: number;
    }) => {
    try {
      setStatisticsLoading(true);
      const data = await getOrganizerStatistics({
        groupBy,
        year,
        month,
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

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-white to-slate-50 text-slate-900">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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
          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overviewLoading && (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                Memuat ringkasan dashboard...
              </div>
            )}

            {!overviewLoading &&
              overviewCards.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.title}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                </article>
              ))}
          </section>
        )}

        {activeTab === 'events' && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

            {eventsLoading && <p className="text-sm text-slate-500">Memuat data event...</p>}

            {!eventsLoading && events.length === 0 && (
              <p className="text-sm text-slate-500">Belum ada event untuk organizer ini.</p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-200"
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
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

            {transactionsLoading && <p className="text-sm text-slate-500">Memuat transaksi...</p>}

            {!transactionsLoading && transactions.length === 0 && (
              <p className="text-sm text-slate-500">Tidak ada transaksi sesuai filter.</p>
            )}

            <div className="grid gap-4">
              {transactions.map((transaction) => (
                <article key={transaction.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
          </section>
        )}

        {activeTab === 'statistics' && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

                <button
                  type="button"
                  onClick={() => {
                    void fetchStatistics({
                      groupBy: statsQuery.groupBy,
                      year: statsQuery.groupBy === 'year' ? undefined : statsQuery.year,
                      month: statsQuery.groupBy === 'day' ? statsQuery.month : undefined,
                    });
                  }}
                  className="h-10.5 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Load Chart
                </button>
              </div>
            </div>

            {statisticsLoading && <p className="text-sm text-slate-500">Memuat statistik...</p>}

            {!statisticsLoading && statistics && statistics.series.length === 0 && (
              <p className="text-sm text-slate-500">Belum ada data statistik DONE untuk filter ini.</p>
            )}

            {!statisticsLoading && statistics && statistics.series.length > 0 && (
              <div className="h-96 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statistics.series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => {
                        const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                        const label = String(name);

                        if (label === 'revenue') {
                          return [formatIdr(numericValue), 'Revenue'];
                        }

                        return [numericValue, label];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="transactionCount" name="Transactions" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="ticketsSold" name="Tickets Sold" fill="#0284c7" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="revenue" name="Revenue" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}

        {activeTab === 'attendees' && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

            {attendeesLoading && <p className="text-sm text-slate-500">Memuat attendee...</p>}

            {!attendeesLoading && attendees.length === 0 && (
              <p className="text-sm text-slate-500">Belum ada attendee untuk event ini.</p>
            )}

            {!attendeesLoading && attendees.length > 0 && (
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
  <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    
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

    {ratingsLoading && <p className="text-sm text-slate-500">Loading...</p>}

    {!ratingsLoading && ratings.length === 0 && (
      <p className="text-sm text-slate-500">Belum ada review</p>
    )}

    {!ratingsLoading && ratings.length > 0 && (
      <div className="space-y-3">
        {ratings.map((r) => (
          <div
            key={r.id}
            className="p-4 border rounded-xl hover:shadow-md transition bg-slate-50"
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