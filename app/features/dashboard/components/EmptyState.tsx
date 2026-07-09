export function EmptyState({ query }: { readonly query: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border py-16 text-center">
      <p className="font-medium">No assets match “{query}”</p>
      <p className="mt-1 text-sm text-muted">Try a name like “bitcoin” or a symbol like “btc”.</p>
    </div>
  )
}
