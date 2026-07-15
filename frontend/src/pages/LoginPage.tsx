// /admin/login (ADMN-01): username + password, inline error on 401, friendly message on 429,
// loading state on submit, redirect to /admin (or a same-app returnTo) on success. Never logs
// the token or password anywhere -- the only place either value exists is this form's local
// state and the one POST /api/auth/login request AuthContext.login() makes.
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../api/AuthContext'
import { ApiError } from '../api/client'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

const UNAUTHORIZED_MESSAGE = 'Invalid username or password'
const RATE_LIMITED_MESSAGE = 'Too many attempts, try again shortly'
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

// Only ever redirects back to a same-app /admin path -- an untrusted `returnTo` query param is
// never followed verbatim (open-redirect guard: a crafted link like
// /admin/login?returnTo=https://evil.example could otherwise send a just-authenticated admin
// straight to an external site).
function safeReturnTo(raw: string | null): string {
  if (raw && raw.startsWith('/admin')) {
    return raw
  }
  return '/admin'
}

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    auth
      .login(username, password)
      .then(() => {
        navigate(safeReturnTo(searchParams.get('returnTo')), { replace: true })
      })
      .catch((caught: unknown) => {
        if (caught instanceof ApiError && caught.status === 401) {
          setError(UNAUTHORIZED_MESSAGE)
        } else if (caught instanceof ApiError && caught.status === 429) {
          setError(RATE_LIMITED_MESSAGE)
        } else {
          setError(GENERIC_ERROR_MESSAGE)
        }
      })
      .finally(() => setIsSubmitting(false))
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Lock aria-hidden="true" size={20} />
          </span>
          <h1 className="font-mono text-[22px] font-semibold leading-[1.2] text-foreground">Admin sign in</h1>
          <p className="text-[14px] leading-[1.4] text-muted">Code.Hub Tech Radar</p>
        </div>
        {/* Custom error presentation only -- native browser validation UI is suppressed so a
            blank-field submit never shows an inconsistent, unbranded tooltip (the Sign in button
            is disabled until both fields are non-empty instead). */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-username" className="font-mono text-[13px] font-semibold text-muted">
              Username
            </label>
            <Input
              id="login-username"
              name="username"
              value={username}
              onChange={setUsername}
              autoComplete="username"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="font-mono text-[13px] font-semibold text-muted">
              Password
            </label>
            <div className="relative">
              <Input
                id="login-password"
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                required
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                aria-pressed={isPasswordVisible}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-200 hover:bg-surface-raised hover:text-foreground"
              >
                {isPasswordVisible ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-[14px] leading-[1.4] text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" isLoading={isSubmitting} disabled={username === '' || password === ''}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
