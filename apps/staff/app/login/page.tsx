"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  LayersIcon,
  StoreIcon,
  TagsIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"

import { login, post } from "@/lib/frappe"

const FIELD =
  "h-11 rounded-lg focus-visible:border-primary focus-visible:ring-primary/25"

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const next = useSearchParams().get("next") || "/products"
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [show, setShow] = React.useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      await login(String(form.get("usr")), String(form.get("pwd")))
      // Full reload so the new session cookie is used everywhere.
      window.location.assign(next.startsWith("/") ? next : "/products")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed")
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="usr">Email or username</FieldLabel>
          <Input
            id="usr"
            name="usr"
            autoComplete="username"
            placeholder="you@example.com"
            required
            autoFocus
            aria-invalid={error ? true : undefined}
            className={FIELD}
          />
        </Field>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="pwd">Password</FieldLabel>
            <button
              type="button"
              onClick={onForgot}
              className="text-sm font-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="pwd"
              name="pwd"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              aria-invalid={error ? true : undefined}
              className={`${FIELD} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
            >
              {show ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </div>
        </Field>
      </FieldGroup>
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending && <Spinner data-icon="inline-start" />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [pending, setPending] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const user = String(new FormData(event.currentTarget).get("user")).trim()
    setPending(true)
    setError(null)
    try {
      // Frappe always answers the same way, so this never reveals whether an account exists.
      await post("frappe.core.doctype.user.user.reset_password", { user })
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the reset link")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {sent ? (
        <p
          role="status"
          className="rounded-lg bg-success/10 px-3 py-3 text-sm text-success"
        >
          If that account exists, we have sent a link to reset the password.
          Check your inbox.
        </p>
      ) : (
        <>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="user">Email or username</FieldLabel>
              <Input
                id="user"
                name="user"
                autoComplete="username"
                placeholder="you@example.com"
                required
                autoFocus
                className={FIELD}
              />
            </Field>
          </FieldGroup>
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="h-11" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </>
      )}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-4" />
        Back to sign in
      </button>
    </form>
  )
}

const POINTS = [
  { icon: LayersIcon, text: "One stock count for every location" },
  { icon: TagsIcon, text: "Wholesale, online and self-delivery prices" },
  { icon: StoreIcon, text: "Shop, dealers and website in one place" },
]

export default function LoginPage() {
  const [forgot, setForgot] = React.useState(false)
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[1.05fr_1fr]">
      <section className="relative flex flex-col justify-between gap-10 overflow-hidden bg-gradient-to-br from-ink via-ink-2 to-primary p-12 text-white max-lg:hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-chart-2/35 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/20 font-heading text-lg font-bold ring-1 ring-white/40">
            AT
          </div>
          <span className="font-heading text-lg font-semibold">
            Adeel Traders
          </span>
        </div>
        <div className="relative flex flex-col gap-8">
          <div className="flex max-w-xl flex-col gap-4">
            <p className="font-heading text-5xl leading-[1.08] font-semibold tracking-tight text-balance">
              One stock count for the shop, the dealers and the website.
            </p>
            <p className="text-lg text-white/70">
              Prices, stock and orders for every channel, always in sync.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/85">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative self-end text-sm text-white/60">
          Need help? Contact your administrator · v0.1
        </p>
      </section>
      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[26rem]">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {forgot ? "Reset your password" : "Welcome back"}
          </h1>
          <p className="mt-1.5 mb-8 text-muted-foreground">
            {forgot
              ? "Enter your email and we will send you a reset link."
              : "Sign in to your Adeel Traders account."}
          </p>
          {forgot ? (
            <ForgotForm onBack={() => setForgot(false)} />
          ) : (
            <React.Suspense>
              <SignInForm onForgot={() => setForgot(true)} />
            </React.Suspense>
          )}
        </div>
      </section>
    </main>
  )
}
