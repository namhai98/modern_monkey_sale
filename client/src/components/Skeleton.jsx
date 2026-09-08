// Elegant placeholder block — never a spinner, never blank.
export default function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`bg-ivory animate-pulse ${className}`} />;
}

// Full product-detail placeholder (gallery + info column).
export function ProductDetailSkeleton() {
  return (
    <div className="bg-canvas lg:grid lg:grid-cols-[58%_42%]">
      <Skeleton className="aspect-[4/5] sm:aspect-square lg:aspect-auto lg:h-[calc(100svh-12.5rem)] lg:min-h-[440px] w-full" />
      <div className="px-6 md:px-14 py-12 md:py-16 lg:py-14 space-y-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-20" />
        <div className="pt-6 flex gap-3">
          <Skeleton className="h-12 w-28" />
          <Skeleton className="h-12 flex-1" />
        </div>
        <div className="pt-8 space-y-3">
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-px w-full" />
        </div>
      </div>
    </div>
  );
}
