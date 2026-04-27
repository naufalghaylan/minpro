type OverviewCard = {
  title: string;
  value: string;
};

type OverviewTabProps = {
  cards: OverviewCard[];
  isLoading: boolean;
  isTabSkeletonVisible: boolean;
  tabRevealClass: string;
  getItemRevealClass: (index: number) => string;
};

export function OverviewTab({
  cards,
  isLoading,
  isTabSkeletonVisible,
  tabRevealClass,
  getItemRevealClass,
}: OverviewTabProps) {
  return (
    <section className={`mt-6 grid gap-4 transition-all duration-500 delay-75 sm:grid-cols-2 lg:grid-cols-3 ${tabRevealClass}`}>
      {(isLoading || isTabSkeletonVisible) && (
        <div className="col-span-full grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`overview-skeleton-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-3 w-24 rounded dashboard-skeleton-shimmer" />
              <div className="mt-3 h-8 w-28 rounded dashboard-skeleton-shimmer" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isTabSkeletonVisible &&
        cards.map((item, index) => (
          <article
            key={item.title}
            className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md ${getItemRevealClass(index)}`}
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.title}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
          </article>
        ))}
    </section>
  );
}