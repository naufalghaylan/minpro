import type {
  OrganizerEventItem,
  OrganizerTransactionItem,
  OrganizerTransactionStatus,
  OrganizerTransactionsMeta,
} from '../../../types/organizer-dashboard';
import { formatIdr, getDecisionCountdown } from '../utils';

type TransactionsTabProps = {
  events: OrganizerEventItem[];
  transactionStatuses: Array<OrganizerTransactionStatus | 'ALL'>;
  transactionStatusFilter: OrganizerTransactionStatus | 'ALL';
  transactionEventFilter: string;
  transactionMeta: OrganizerTransactionsMeta;
  transactions: OrganizerTransactionItem[];
  transactionsLoading: boolean;
  isTabSkeletonVisible: boolean;
  tabRevealClass: string;
  getItemRevealClass: (index: number) => string;
  decisionReasonById: Record<string, string>;
  transactionActionLoadingId: string | null;
  now: number;
  onTransactionStatusFilterChange: (value: OrganizerTransactionStatus | 'ALL') => void;
  onTransactionEventFilterChange: (value: string) => void;
  onApplyFilter: () => void;
  onDecisionReasonChange: (transactionId: string, reason: string) => void;
  onTransactionDecision: (transactionId: string, action: 'accept' | 'reject') => void;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function TransactionsTab({
  events,
  transactionStatuses,
  transactionStatusFilter,
  transactionEventFilter,
  transactionMeta,
  transactions,
  transactionsLoading,
  isTabSkeletonVisible,
  tabRevealClass,
  getItemRevealClass,
  decisionReasonById,
  transactionActionLoadingId,
  now,
  onTransactionStatusFilterChange,
  onTransactionEventFilterChange,
  onApplyFilter,
  onDecisionReasonChange,
  onTransactionDecision,
  onPrevPage,
  onNextPage,
}: TransactionsTabProps) {
  return (
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
                onTransactionStatusFilterChange(next);
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
                onTransactionEventFilterChange(event.target.value);
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
            onClick={onApplyFilter}
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
        {!isTabSkeletonVisible &&
          transactions.map((transaction, index) => (
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
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-800">
                      ⏰ Sisa waktu untuk keputusan: {getDecisionCountdown(transaction.paidAt, now)}
                    </p>
                  </div>

                  <label className="block text-sm text-slate-600">
                    Catatan keputusan (opsional)
                    <textarea
                      className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={decisionReasonById[transaction.id] || ''}
                      onChange={(event) => onDecisionReasonChange(transaction.id, event.target.value)}
                      placeholder="Contoh: Bukti pembayaran valid"
                    />
                  </label>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={transactionActionLoadingId === transaction.id}
                      onClick={() => {
                        onTransactionDecision(transaction.id, 'accept');
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Accept + Kirim Email
                    </button>
                    <button
                      type="button"
                      disabled={transactionActionLoadingId === transaction.id}
                      onClick={() => {
                        onTransactionDecision(transaction.id, 'reject');
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
            onClick={onPrevPage}
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
            onClick={onNextPage}
            className="rounded-lg border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}