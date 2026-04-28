import type {
  OrganizerAttendeeItem,
  OrganizerEventItem,
} from '../../../types/organizer-dashboard';
import { formatDateTime, formatIdr } from '../utils';

type AttendeesTabProps = {
  events: OrganizerEventItem[];
  selectedAttendeeEventId: string;
  attendees: OrganizerAttendeeItem[];
  attendeesLoading: boolean;
  isTabSkeletonVisible: boolean;
  tabRevealClass: string;
  onSelectedAttendeeEventIdChange: (eventId: string) => void;
  onLoadAttendees: () => void;
};

export function AttendeesTab({
  events,
  selectedAttendeeEventId,
  attendees,
  attendeesLoading,
  isTabSkeletonVisible,
  tabRevealClass,
  onSelectedAttendeeEventIdChange,
  onLoadAttendees,
}: AttendeesTabProps) {
  return (
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
            onChange={(event) => onSelectedAttendeeEventIdChange(event.target.value)}
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
            onClick={onLoadAttendees}
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
  );
}