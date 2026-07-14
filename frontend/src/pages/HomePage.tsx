import { Header } from '../components/Header'

// Thin shell for now — data wiring (useEntries, filters, radar, list) arrives in 02-02+.
// The "Skip to list view" link is deferred until the list view it targets exists (Wave 7).
export function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-8" />
    </div>
  )
}
