import type { MetaFunction } from '@remix-run/node'

export const meta: MetaFunction = () => [
  { title: 'Revyse Tape' },
  { name: 'description', content: 'Live cryptocurrency exchange rates in USD and BTC.' },
]

export default function Dashboard() {
  return <main className="p-8 text-2xl font-semibold">Revyse Tape</main>
}
