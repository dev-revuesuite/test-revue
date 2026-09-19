"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  Bug,
  CheckCircle2,
  Lightbulb,
  LifeBuoy,
  Loader2,
  Mail,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { submitSupportRequest } from "@/lib/actions/support-requests"
import {
  SUPPORT_REQUEST_FORMS,
  type SupportRequestType,
} from "@/lib/support-request-config"

const CARDS: Array<{
  type: SupportRequestType
  title: string
  blurb: string
  icon: React.ElementType
  accent: string
  accentBg: string
}> = [
  {
    type: "bug",
    title: "Report a Bug",
    blurb: "Something isn't working as expected? Tell us what happened.",
    icon: Bug,
    accent: "text-rose-500",
    accentBg: "bg-rose-500/10",
  },
  {
    type: "support",
    title: "Contact Support",
    blurb: "Need help with your account or have a question?",
    icon: LifeBuoy,
    accent: "text-[#5C6ECD]",
    accentBg: "bg-[#5C6ECD]/10",
  },
  {
    type: "feature",
    title: "Request a Feature",
    blurb: "Have an idea that would make RevueSuite better?",
    icon: Lightbulb,
    accent: "text-amber-500",
    accentBg: "bg-amber-500/10",
  },
]

type Status = "idle" | "submitting" | "success"

export function HelpDeskContent({ inboxEmail }: { inboxEmail: string }) {
  const pathname = usePathname()
  const [selectedType, setSelectedType] = React.useState<SupportRequestType | null>(null)
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [status, setStatus] = React.useState<Status>("idle")
  const [emailDelivered, setEmailDelivered] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLDivElement | null>(null)
  const successRef = React.useRef<HTMLHeadingElement | null>(null)

  const form = selectedType ? SUPPORT_REQUEST_FORMS[selectedType] : null

  React.useEffect(() => {
    if (status === "success") {
      successRef.current?.focus()
    }
  }, [status])

  function selectType(type: SupportRequestType) {
    setSelectedType((current) => {
      const next = current === type ? null : type
      if (next !== current) {
        setValues({})
        setError(null)
        setStatus("idle")
      }
      return next
    })
    // Bring the form into view on small screens once it renders.
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    })
  }

  function updateValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form || status === "submitting") return

    // Client-side pass of the same rules the server enforces.
    for (const field of form.fields) {
      const raw = (values[field.key] ?? "").trim()
      if (field.required && !raw) {
        setError(`"${field.label}" is required.`)
        return
      }
      if (raw.length > field.maxLength) {
        setError(`"${field.label}" must be at most ${field.maxLength} characters.`)
        return
      }
    }

    setError(null)
    setStatus("submitting")

    try {
      const result = await submitSupportRequest({
        type: form.type,
        fields: values,
        pageUrl: pathname ?? "/help-desk",
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "",
      })

      if (result.success) {
        setEmailDelivered(result.emailDelivered !== false)
        setStatus("success")
        setValues({})
      } else {
        setStatus("idle")
        setError(result.error ?? "Something went wrong. Please try again.")
      }
    } catch {
      setStatus("idle")
      setError(
        `Something went wrong while sending your request. Please try again, or email ${inboxEmail} directly.`
      )
    }
  }

  function resetAll() {
    setSelectedType(null)
    setValues({})
    setError(null)
    setStatus("idle")
    setEmailDelivered(true)
  }

  return (
    <section aria-labelledby="help-options-heading">
      <h2
        id="help-options-heading"
        className="text-lg font-semibold text-foreground mb-4"
      >
        How can we help?
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        {CARDS.map((card) => {
          const Icon = card.icon
          const isSelected = selectedType === card.type
          return (
            <button
              key={card.type}
              type="button"
              onClick={() => selectType(card.type)}
              aria-expanded={isSelected}
              className={cn(
                "text-left bg-card border rounded-2xl p-5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                isSelected
                  ? "border-[#5C6ECD]"
                  : "border-border hover:border-muted-foreground/40"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                  card.accentBg
                )}
              >
                <Icon className={cn("w-5 h-5", card.accent)} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {card.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{card.blurb}</p>
            </button>
          )
        })}
      </div>

      {status === "success" && (
        <div className="mt-6 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3
                ref={successRef}
                tabIndex={-1}
                className="text-lg font-semibold text-foreground outline-none"
              >
                Request sent successfully
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {emailDelivered
                  ? "Thanks for contacting RevueSuite. Our team will review your request and reply to your email."
                  : "We saved your request. Email notification did not send from this environment — our team can still see it in our system, or you can email us directly."}
              </p>
              {emailDelivered ? (
                <p className="text-sm text-muted-foreground mt-2">
                  Your request was sent to{" "}
                  <a
                    href={`mailto:${inboxEmail}`}
                    className="font-medium text-[#5C6ECD] hover:underline"
                  >
                    {inboxEmail}
                  </a>
                  .
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Contact{" "}
                  <a
                    href={`mailto:${inboxEmail}`}
                    className="font-medium text-[#5C6ECD] hover:underline"
                  >
                    {inboxEmail}
                  </a>{" "}
                  if you need a quick reply.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 rounded-lg"
                onClick={resetAll}
              >
                Send another request
              </Button>
            </div>
          </div>
        </div>
      )}

      {form && status !== "success" && (
        <div
          ref={formRef}
          className="mt-6 bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-foreground">
            {form.heading}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 mb-5">
            {form.intro}
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {form.fields.map((field) => {
              const fieldId = `support-${form.type}-${field.key}`
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={fieldId}>
                    {field.label}
                    {field.required && (
                      <span aria-hidden="true" className="text-rose-500">
                        *
                      </span>
                    )}
                  </Label>
                  {field.multiline ? (
                    <Textarea
                      id={fieldId}
                      value={values[field.key] ?? ""}
                      onChange={(e) => updateValue(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      maxLength={field.maxLength}
                      disabled={status === "submitting"}
                      className="rounded-lg min-h-24"
                    />
                  ) : (
                    <Input
                      id={fieldId}
                      value={values[field.key] ?? ""}
                      onChange={(e) => updateValue(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      required={field.required}
                      maxLength={field.maxLength}
                      disabled={status === "submitting"}
                      className="rounded-lg"
                    />
                  )}
                </div>
              )
            })}

            <p className="text-xs text-muted-foreground">
              Your name, email, organization, and current page are included
              automatically so you don&apos;t have to type them.
            </p>

            <div aria-live="polite" role="status">
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={status === "submitting"}
                className="rounded-lg bg-[#5C6ECD] hover:bg-[#5C6ECD]/90 text-white"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send request
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                Goes to {inboxEmail}
              </span>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
