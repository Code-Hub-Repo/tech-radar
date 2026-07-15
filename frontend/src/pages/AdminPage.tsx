// /admin (ADMN-02, guarded by RequireAuth in main.tsx). Header carries the admin identity +
// Logout, visually/spatially separated from the entry-management actions that land alongside
// the table in a later wave -- matches Header.tsx's own gradient/accent-underline treatment so
// the admin panel reads as the same product, not a bolted-on form.
import { Link } from 'react-router'
import { LogOut } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { useEntries } from '../api/hooks'
import { Button } from '../components/Button'
import { ErrorState } from '../components/ErrorState'

export function AdminPage() {
  const auth = useAuth()
  const { data, isPending, isError, refetch } = useEntries()
  const entries = data ?? []

  return (
    <div className="min-h-screen">
      <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-border bg-gradient-to-b from-surface to-background px-6 py-5">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(249,115,22,0.55) 20%, rgba(249,115,22,0.55) 80%, transparent)',
            boxShadow: '0 0 8px rgba(249,115,22,0.35)',
          }}
        />
        <div>
          <h1 className="font-mono text-[24px] font-semibold leading-[1.15] text-foreground">Admin</h1>
          <p className="mt-1 text-[13px] leading-[1.5] text-muted">Manage Code.Hub Tech Radar entries</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="font-mono text-[13px] font-semibold text-muted transition-colors duration-200 hover:text-foreground"
          >
            View public radar
          </Link>
          <Button variant="secondary" onClick={() => auth.logout()}>
            <LogOut size={16} aria-hidden="true" />
            Logout
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-8">
        {isError ? (
          <ErrorState
            heading="Couldn't load entries"
            body="Something went wrong fetching the latest data. Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : isPending ? (
          <p className="font-mono text-[14px] leading-[1.4] text-muted">Loading entries…</p>
        ) : (
          <p className="font-mono text-[14px] leading-[1.4] text-muted">{entries.length} entries.</p>
        )}
      </main>
    </div>
  )
}
