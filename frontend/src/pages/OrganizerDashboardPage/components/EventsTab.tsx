import { formatDateTime, formatIdr } from '../utils';
import type { OrganizerEventItem } from '../../../types/organizer-dashboard';

type EventsTabProps = {
  events: OrganizerEventItem[];
  isLoading: boolean;
  isTabSkeletonVisible: boolean;
  tabRevealClass: string;
  getItemRevealClass: (index: number) => string;
  onReload: () => void;
  onEditEvent: (event: OrganizerEventItem) => void;
};

export function EventsTab({
  events,
  isLoading,
  isTabSkeletonVisible,
  tabRevealClass,
  getItemRevealClass,
  onReload,
  onEditEvent,
}: EventsTabProps) {
  return (
    <section
      className={`mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-500 delay-100 ${tabRevealClass} sm:p-6`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Daftar Event Organizer</h2>
        <button
          type="button"
          onClick={onReload}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Reload Events
        </button>
      </div>

      {(isLoading || isTabSkeletonVisible) && (
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

      {!isLoading && !isTabSkeletonVisible && events.length === 0 && (
        <p className="text-sm text-slate-500">Belum ada event untuk organizer ini.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {!isTabSkeletonVisible &&
          events.map((event, index) => (
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
                  onClick={() => onEditEvent(event)}
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
  );
}