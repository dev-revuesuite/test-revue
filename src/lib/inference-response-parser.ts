export interface ParsedInferenceBBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface ParsedInferenceSuggestion {
  label: string
  description: string
  severity: "error" | "warning" | "info"
  bbox: ParsedInferenceBBox
  sortOrder: number
}

function isNumberPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  )
}

type RawApiBBox = [[number, number], [number, number]]

function isBBox(value: unknown): value is RawApiBBox {
  if (!Array.isArray(value) || value.length !== 2) return false
  const [topLeft, bottomRight] = value
  if (!isNumberPair(topLeft) || !isNumberPair(bottomRight)) return false
  return true
}

function tryNormalizeBBox(value: unknown): ParsedInferenceBBox | null {
  if (!isBBox(value)) {
    return null
  }

  const [[x1, y1], [x2, y2]] = value
  return {
    x1: Math.min(x1, x2),
    y1: Math.min(y1, y2),
    x2: Math.max(x1, x2),
    y2: Math.max(y1, y2),
  }
}

export function parseGramcheckResponse(
  payload: unknown
): ParsedInferenceSuggestion[] {
  if (!payload || typeof payload !== "object") return []

  const gramCheck = (payload as { Gram_check?: Record<string, unknown> })
    .Gram_check
  if (!gramCheck || typeof gramCheck !== "object") return []

  const suggestions: ParsedInferenceSuggestion[] = []

  for (const [wrongWord, bboxValue] of Object.entries(gramCheck)) {
    const bbox = tryNormalizeBBox(bboxValue)
    if (!bbox) continue

    suggestions.push({
      label: wrongWord,
      description: `Detected text: "${wrongWord}"`,
      severity: "error",
      bbox,
      sortOrder: suggestions.length,
    })
  }

  return suggestions
}

export function parseWordspaceResponse(
  payload: unknown
): ParsedInferenceSuggestion[] {
  if (!payload || typeof payload !== "object") return []

  const wordSpaceError = (
    payload as { Word_space_error?: Record<string, unknown> }
  ).Word_space_error
  if (!wordSpaceError || typeof wordSpaceError !== "object") return []

  const suggestions: ParsedInferenceSuggestion[] = []

  for (const [, bboxValue] of Object.entries(wordSpaceError)) {
    const bbox = tryNormalizeBBox(bboxValue)
    if (!bbox) continue

    suggestions.push({
      label: "Spacing issue",
      description: "Word spacing issue detected",
      severity: "warning",
      bbox,
      sortOrder: suggestions.length,
    })
  }

  return suggestions
}
