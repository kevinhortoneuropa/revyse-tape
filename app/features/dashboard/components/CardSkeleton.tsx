import { Card } from '~/components/ui/Card'
import { Skeleton } from '~/components/ui/Skeleton'

/** Mirrors AssetCard's geometry so nothing shifts when the real data lands. */
export function CardSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
      <div className="mt-auto space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </Card>
  )
}

export function CardSkeletonGrid({ count = 12 }: { readonly count?: number }) {
  return (
    <div
      // The live region announces loading; the skeletons themselves are noise.
      aria-hidden
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
