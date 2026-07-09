import type { MetaFunction } from '@remix-run/node'
import { useRouteLoaderData } from '@remix-run/react'

import { ThemeToggle } from '~/features/theme/ThemeToggle'
import type { ThemePreference } from '~/lib/theme'

export const meta: MetaFunction = () => [
  { title: 'Revyse Tape' },
  { name: 'description', content: 'Live cryptocurrency exchange rates in USD and BTC.' },
]

export default function Dashboard() {
  const root = useRouteLoaderData<{ theme: ThemePreference }>('root')

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Revyse Tape</h1>
        <ThemeToggle preference={root?.theme ?? 'system'} />
      </header>
    </main>
  )
}
