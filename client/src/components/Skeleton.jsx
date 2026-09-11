// Elegant placeholder block — never a spinner, never blank.
export default function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse bg-surface ${className}`} />;
}

// Full product-detail placeholder — mirrors the real page's split, breadcrumb
// row and control stack so the layout doesn't jump when the data lands.
export function ProductDetailSkeleton() {
  return (
    <div>
      <div className="container-lux py-5">
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="lg:grid lg:grid-cols-[58%_42%]">
        <Skeleton className="aspect-[4/5] w-full sm:aspect-square lg:aspect-auto lg:h-[calc(100svh-12.5rem)] lg:min-h-[440px]" />
        <div className="space-y-5 px-6 py-12 md:px-12 md:py-16 lg:py-14">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-11 w-3/4" />
          <Skeleton className="h-5 w-24" />
          <div className="flex gap-4 pt-8">
            <Skeleton className="h-12 w-28" />
            <Skeleton className="h-12 flex-1" />
          </div>
          <div className="space-y-6 pt-10">
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-px w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Product grid placeholder — card frame plus its two meta lines, so a loading
// grid has the same rhythm as a loaded one.
export function ProductGridSkeleton({ count = 8, className = '' }) {
  return (
    <div className={`grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 xl:grid-cols-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/5] w-full" />
          <Skeleton className="mt-5 h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
