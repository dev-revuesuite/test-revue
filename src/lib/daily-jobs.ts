/** What a daily job returns in place of its result when it fails. */
export interface DailyJobFailure {
  error: string
}

export function isDailyJobFailure(value: unknown): value is DailyJobFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 1 &&
    typeof (value as DailyJobFailure).error === "string"
  )
}

/**
 * Runs one daily job so that its failure is logged but never stops the jobs
 * after it. `summarize` picks what to log on success (defaults to the result).
 */
export async function runIsolated<T>(
  label: string,
  job: () => Promise<T>,
  summarize?: (result: T) => unknown
): Promise<T | DailyJobFailure> {
  try {
    const result = await job()
    console.log(`[${label}] Run complete`, summarize ? summarize(result) : result)
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[${label}] Run failed`, { error: message })
    return { error: `${label} failed` }
  }
}
