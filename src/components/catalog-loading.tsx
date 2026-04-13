function SkeletonBlock({
  className,
  dark = false,
}: {
  className: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`coffee-skeleton ${dark ? "coffee-skeleton-dark" : ""} ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

function SidebarGroupSkeleton({
  titleWidth,
  count,
}: {
  titleWidth: string;
  count: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-center">
        <SkeletonBlock className={`h-4 ${titleWidth} rounded-full`} />
      </div>
      <div className="flex flex-col items-center gap-2">
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className="h-[82px] w-[82px] rounded-[22px] border border-[rgba(90,52,37,0.18)] sm:h-[88px] sm:w-[88px] lg:h-[92px] lg:w-[92px]"
          />
        ))}
      </div>
    </div>
  );
}

function ProductRowSkeleton() {
  return (
    <article className="rounded-[26px] border border-[rgba(72,46,34,0.1)] bg-white p-3 shadow-[0_12px_28px_rgba(61,34,23,0.05)] sm:p-4">
      <div className="grid grid-cols-[minmax(96px,1fr)_minmax(0,3fr)] items-stretch gap-3 sm:grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] sm:gap-4">
        <SkeletonBlock className="min-h-[164px] rounded-[22px]" />

        <div className="flex min-h-[168px] min-w-0 flex-col">
          <div className="min-w-0">
            <SkeletonBlock className="h-5 w-[58%] rounded-full sm:h-6" />
            <SkeletonBlock className="mt-2 h-3 w-24 rounded-full" />
          </div>

          <div className="mt-4 space-y-2">
            <SkeletonBlock className="h-3 w-full rounded-full" />
            <SkeletonBlock className="h-3 w-[88%] rounded-full" />
            <SkeletonBlock className="h-3 w-[72%] rounded-full" />
          </div>

          <div className="mt-auto pt-4">
            <SkeletonBlock className="h-7 w-24 rounded-full" />
            <SkeletonBlock className="mt-3 h-11 w-full max-w-[190px] rounded-full" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function CatalogExperienceSkeleton() {
  return (
    <section
      className="site-shell mt-4 pb-0"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Carregando produtos do cardápio.</span>

      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
        <SkeletonBlock className="h-[52px] rounded-[18px]" />
        <SkeletonBlock className="h-[52px] w-[124px] rounded-full sm:w-[136px]" />
      </div>

      <div className="grid grid-cols-[94px_minmax(0,1fr)] gap-3 sm:grid-cols-[102px_minmax(0,1fr)] sm:gap-4 lg:grid-cols-[120px_minmax(0,1fr)] lg:gap-5">
        <aside className="space-y-5">
          <SidebarGroupSkeleton titleWidth="w-16" count={2} />
          <SidebarGroupSkeleton titleWidth="w-20" count={3} />
        </aside>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[rgba(255,250,244,0.78)] shadow-[0_18px_40px_rgba(61,34,23,0.08)]">
            <div className="border-b border-[rgba(72,46,34,0.12)] bg-[rgba(255,247,240,0.94)] px-4 py-3 sm:px-5 sm:py-3.5">
              <SkeletonBlock className="h-4 w-24 rounded-full" />
              <SkeletonBlock className="mt-3 h-10 w-[min(65%,320px)] rounded-full" />
            </div>

            <div className="space-y-3 p-3 sm:p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <ProductRowSkeleton key={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CatalogPageLoading() {
  return (
    <main className="min-h-screen">
      <header data-public-header="true" className="sticky top-0 z-50 bg-[var(--bg)] pb-1 pt-2">
        <div className="site-shell">
          <div className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[#221511] px-3 py-3 shadow-[0_14px_36px_rgba(34,21,17,0.34)] sm:px-5 sm:py-3.5">
            <div className="grid grid-cols-[1fr_minmax(0,3fr)] items-center gap-3 sm:gap-5">
              <SkeletonBlock
                dark
                className="h-[56px] w-[56px] rounded-[18px] sm:h-[68px] sm:w-[68px] sm:rounded-[20px]"
              />

              <div className="grid min-w-0 gap-2">
                <SkeletonBlock dark className="h-3 w-24 rounded-full" />
                <SkeletonBlock dark className="h-7 w-[min(82%,340px)] rounded-full" />
                <SkeletonBlock dark className="h-6 w-28 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <CatalogExperienceSkeleton />
    </main>
  );
}
