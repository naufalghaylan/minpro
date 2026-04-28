import type { RatingItem } from '../types';

type RatingsTabProps = {
  ratings: RatingItem[];
  avgRating: number;
  isLoading: boolean;
  isTabSkeletonVisible: boolean;
  tabRevealClass: string;
  getItemRevealClass: (index: number) => string;
};

export function RatingsTab({
  ratings,
  avgRating,
  isLoading,
  isTabSkeletonVisible,
  tabRevealClass,
  getItemRevealClass,
}: RatingsTabProps) {
  return (
    <section className={`mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-500 delay-200 ${tabRevealClass}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Ratings ⭐</h2>

        <div className="text-sm text-slate-600">
          Avg:
          <span className="ml-2 rounded-lg bg-yellow-100 px-2 py-1 font-semibold text-yellow-600">
            {avgRating.toFixed(1)}
          </span>
        </div>
      </div>

      {(isLoading || isTabSkeletonVisible) && (
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

      {!isLoading && !isTabSkeletonVisible && ratings.length === 0 && (
        <p className="text-sm text-slate-500">Belum ada review</p>
      )}

      {!isLoading && !isTabSkeletonVisible && ratings.length > 0 && (
        <div className="space-y-3">
          {ratings.map((rating, index) => (
            <div key={rating.id} className={`rounded-xl border bg-slate-50 p-4 hover:shadow-md ${getItemRevealClass(index)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{rating.user?.name || 'User'}</p>
                  <p className="text-xs text-slate-500">{rating.event?.name || 'Event'}</p>
                </div>

                <div className="text-xs text-slate-400">{new Date(rating.createdAt).toLocaleDateString()}</div>
              </div>

              <div className="mt-2 flex items-center gap-1 text-yellow-500">
                {'★'.repeat(rating.rating)}
                {'☆'.repeat(5 - rating.rating)}
                <span className="ml-2 text-sm text-slate-600">({rating.rating})</span>
              </div>

              <p className="mt-2 text-sm text-slate-700">{rating.comment || 'Tidak ada komentar'}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}