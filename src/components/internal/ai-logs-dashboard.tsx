"use client"

import { useCallback, useEffect, useState } from "react"

import {
  deploymentEnvironmentLabel,
  inferenceEndpointLabel,
  inferenceSourceLabel,
} from "@/lib/ai-inference-log-labels"
import type { AiInferenceLogDetail, AiInferenceLogListItem } from "@/lib/ai-inference-log-query"
import { Button } from "@/components/ui/button"
import { apiPath } from "@/lib/base-path"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function statusClass(status: string): string {
  switch (status) {
    case "success":
      return "text-emerald-700 dark:text-emerald-400"
    case "failed":
      return "text-red-700 dark:text-red-400"
    default:
      return "text-amber-700 dark:text-amber-400"
  }
}

export function AiLogsDashboard() {
  const [environment, setEnvironment] = useState("production")
  const [endpoint, setEndpoint] = useState("all")
  const [status, setStatus] = useState("all")
  const [source, setSource] = useState("all")
  const [rows, setRows] = useState<AiInferenceLogListItem[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<AiInferenceLogDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)

  const limit = 50

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        environment,
        limit: String(limit),
        offset: String(offset),
      })
      if (endpoint !== "all") params.set("endpoint", endpoint)
      if (status !== "all") params.set("status", status)
      if (source !== "all") params.set("source", source)

      const response = await fetch(`${apiPath("/api/internal/ai-logs")}?${params.toString()}`, {
        cache: "no-store",
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || `Request failed (${response.status})`)
      }
      const data = (await response.json()) as {
        rows: AiInferenceLogListItem[]
        total: number
      }
      setRows(data.rows)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs")
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [environment, endpoint, status, source, offset])

  useEffect(() => {
    // Refetch when filters/pagination change; async fetch updates list state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (!selectedId) {
      return
    }

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetailLoading(true)
    setDetailError(false)
    void (async () => {
      try {
        const response = await fetch(apiPath(`/api/internal/ai-logs/${selectedId}`), {
          cache: "no-store",
        })
        if (!response.ok) {
          throw new Error("Failed to load detail")
        }
        const data = (await response.json()) as AiInferenceLogDetail
        if (!cancelled) setDetail(data)
      } catch {
        if (!cancelled) setDetailError(true)
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedId])

  const page = Math.floor(offset / limit) + 1
  const pageCount = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-6 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AI inference logs</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Internal audit log of inference requests: inputs, responses, and failures.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Environment"
            value={environment}
            onValueChange={(v) => {
              setOffset(0)
              setEnvironment(v)
            }}
            options={[
              { value: "production", label: "Production" },
              { value: "staging", label: "Staging" },
              { value: "development", label: "Development" },
              { value: "all", label: "All" },
            ]}
          />
          <FilterSelect
            label="Model"
            value={endpoint}
            onValueChange={(v) => {
              setOffset(0)
              setEndpoint(v)
            }}
            options={[
              { value: "all", label: "All" },
              { value: "gramcheck", label: "Spelling" },
              { value: "wordspace", label: "Spacing" },
              { value: "lineheight", label: "Line height" },
            ]}
          />
          <FilterSelect
            label="Status"
            value={status}
            onValueChange={(v) => {
              setOffset(0)
              setStatus(v)
            }}
            options={[
              { value: "all", label: "All" },
              { value: "success", label: "Success" },
              { value: "failed", label: "Failed" },
              { value: "running", label: "Running" },
            ]}
          />
          <FilterSelect
            label="Source"
            value={source}
            onValueChange={(v) => {
              setOffset(0)
              setSource(v)
            }}
            options={[
              { value: "all", label: "All" },
              { value: "studio_analysis", label: "Studio" },
              { value: "quick_analysis", label: "Quick analysis" },
            ]}
          />
          <Button variant="outline" size="sm" onClick={() => void loadList()}>
            Refresh
          </Button>
        </div>

        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : null}

        <div className="border-border overflow-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Model</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Duration</th>
                <th className="px-3 py-2 font-medium">Suggestions</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Env</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground px-3 py-8 text-center">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground px-3 py-8 text-center">
                    No logs match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b last:border-0 cursor-pointer hover:bg-muted/40",
                      selectedId === row.id && "bg-muted/60"
                    )}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatTime(row.created_at)}
                    </td>
                    <td className="px-3 py-2">{inferenceEndpointLabel(row.endpoint)}</td>
                    <td className={cn("px-3 py-2 capitalize", statusClass(row.status))}>
                      {row.status}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.duration_ms != null ? `${row.duration_ms} ms` : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.suggestion_count ?? "—"}
                    </td>
                    <td className="px-3 py-2">{inferenceSourceLabel(row.source)}</td>
                    <td className="px-3 py-2">
                      {deploymentEnvironmentLabel(row.environment)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {total} total · page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset <= 0 || loading}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + limit >= total || loading}
              onClick={() => setOffset((o) => o + limit)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <aside className="border-border flex w-full shrink-0 flex-col gap-3 rounded-lg border p-4 lg:w-[420px]">
        <h2 className="text-sm font-semibold">Detail</h2>
        {!selectedId ? (
          <p className="text-muted-foreground text-sm">Select a row to inspect.</p>
        ) : detailError ? (
          <p className="text-muted-foreground text-sm">Could not load this log.</p>
        ) : detailLoading || !detail || detail.id !== selectedId ? (
          <p className="text-muted-foreground text-sm">Loading detail…</p>
        ) : (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="break-all font-mono">{detail.id}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd className={cn("capitalize", statusClass(detail.status))}>
                {detail.status}
              </dd>
              {detail.error_message ? (
                <>
                  <dt className="text-muted-foreground">Error</dt>
                  <dd className="text-red-700 dark:text-red-400">{detail.error_message}</dd>
                </>
              ) : null}
              <dt className="text-muted-foreground">User</dt>
              <dd className="break-all font-mono">{detail.user_id ?? "—"}</dd>
              <dt className="text-muted-foreground">Iteration</dt>
              <dd className="break-all font-mono">{detail.iteration_id ?? "—"}</dd>
              <dt className="text-muted-foreground">Quick analysis</dt>
              <dd className="break-all font-mono">{detail.quick_analysis_id ?? "—"}</dd>
              <dt className="text-muted-foreground">Page</dt>
              <dd>{detail.page_number ?? "—"}</dd>
            </dl>

            {detail.image_url ? (
              <div className="border-border overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detail.image_url}
                  alt="Input sent to inference"
                  className="max-h-64 w-full object-contain bg-neutral-100 dark:bg-neutral-900"
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">No stored input image.</p>
            )}

            {detail.status === "success" && detail.response_json != null ? (
              <pre className="bg-muted max-h-80 overflow-auto rounded-md p-2 text-[11px] leading-relaxed">
                {JSON.stringify(detail.response_json, null, 2)}
              </pre>
            ) : null}
          </>
        )}
      </aside>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
