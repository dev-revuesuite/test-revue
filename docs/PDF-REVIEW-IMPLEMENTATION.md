# Multi-Page PDF Review — Implementation Plan

Step-by-step guide for PDF creatives in Revue: page pager, per-page comments/drawings, and room upload. **Do not start coding until you approve each phase.**

---

## Goals

- Upload a PDF as a **creative** from the room page.
- Open it in **Revue** with **Previous / Next** page navigation.
- Comment, draw, compare, and AI tools apply to the **current page only**.
- Store **one PDF file** per iteration; annotations use **`page_number`** in the database.
- **Image creatives** keep working unchanged (`page_number = 1`).

---

## Recommended library

Use **`pdfjs-dist` (PDF.js)** — not a second canvas engine.

| Option | Verdict |
|--------|---------|
| **`pdfjs-dist`** | **Best fit:** render one page at a time to `<canvas>`, get `numPages`, works with your existing SVG overlay for pins/draws |
| **`react-pdf`** | Thinner React API, still PDF.js under the hood; fine if you want `<Document>` / `<Page>`, but you’ll fight less if you control the canvas yourself |
| **iframe only** | Easy preview, **bad** for pin/draw (coordinates, zoom, compare) |
| **Fabric** (already in repo) | Optional later; today `canvas-area.tsx` uses `<img>` + SVG, not Fabric for Revue |

**Add:** `pdfjs-dist` (+ copy worker file for Next.js).

**Do not** replace your annotation stack — put PDF **under** the same overlay you use for images.

**License:** PDF.js is free (Apache 2.0).

**Alternative (not v1):** server-side conversion of each PDF page to PNG — no client PDF lib, more backend work.

---

## Architecture (coding concepts)

```text
RevueCanvas (orchestrator state)
  ├── currentPage, totalPages, mediaType: "image" | "pdf"
  ├── filtered feedbacks/drawings for currentPage
  └── CanvasArea
        ├── MediaLayer  → <img> OR <PdfPageCanvas page={n} />
        └── AnnotationLayer → same SVG (pins, drawings) — % coordinates unchanged
```

| Concept | How it applies |
|---------|----------------|
| **Strategy / polymorphic media** | One canvas, two backends (image URL vs PDF URL) |
| **Lifted state** | `currentPage` lives in `communication-canvas.tsx`, passed down |
| **Derived data** | `markers = allFeedbacks.filter(f => f.page === currentPage)` |
| **Normalized coordinates** | Keep `x`, `y` as **0–100%** of the visible page box (same as images; no change to coord math) |
| **Composition** | Small `PdfPageViewer` + existing `CanvasArea` overlay |
| **Lazy render** | Only render current page (+ maybe ±1 for fast flip) |

---

## Phase 1 — Database (Supabase migration)

Add columns (default `1` so old images keep working):

| Table | Column | Purpose |
|-------|--------|---------|
| `feedbacks` | `page_number int default 1` | Which PDF page the pin is on |
| `drawings` | `page_number int default 1` | Which page the stroke is on |
| `iterations` | `media_type text` (`image` \| `pdf`) | Skip guessing from URL |
| `iterations` | `page_count int` optional | Show “12 pages” without re-parsing |
| `creatives` | `type` (already exists) | Set `document` on PDF upload |

**Migration SQL** — create `supabase/migrations/<timestamp>_pdf_page_support.sql`:

```sql
ALTER TABLE feedbacks
  ADD COLUMN IF NOT EXISTS page_number integer NOT NULL DEFAULT 1;

ALTER TABLE drawings
  ADD COLUMN IF NOT EXISTS page_number integer NOT NULL DEFAULT 1;

ALTER TABLE iterations
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';

ALTER TABLE iterations
  DROP CONSTRAINT IF EXISTS iterations_media_type_check;

ALTER TABLE iterations
  ADD CONSTRAINT iterations_media_type_check
  CHECK (media_type IN ('image', 'pdf'));

ALTER TABLE iterations
  ADD COLUMN IF NOT EXISTS page_count integer;
```

**Inserts:** pass `page_number: currentPage` from Revue when saving feedback/drawing.

**Loads:** `revue/page.tsx` — fetch all feedbacks/drawings for iteration; **filter in UI** by `currentPage` (or SQL `WHERE page_number = $n` if preferred).

### Checklist

- [ ] Create migration file
- [ ] Apply via Supabase CLI or SQL editor
- [ ] Confirm columns exist; RLS still allows insert/select

**Checkpoint:** New rows can include `page_number`; old rows show `1`.

---

## Phase 2 — Detect PDF (shared util)

**New file:** `src/lib/media-type.ts`

- [ ] `isPdfFile(file: File)` — `application/pdf` or `.pdf` extension
- [ ] `isPdfUrl(url: string)` — extension from URL (ignore query string)
- [ ] `getMediaTypeFromUrl(url: string)` → `'image' | 'pdf'`

**Use in:**

- [ ] `room-content.tsx` — `handleAddCreative`: if PDF → `type: 'document'`, `media_type: 'pdf'` on iteration insert
- [ ] `revue/page.tsx` — pass `mediaType` into `RevueCanvas`
- [ ] `communication-canvas.tsx` — `handleNewIterationUpload`

**Update types:**

- [ ] `src/types/revue-tool.ts` — `page_number` on feedback/drawing types
- [ ] `comments-panel.tsx` — `Feedback.pageNumber`
- [ ] `communication-canvas.tsx` — `Iteration.mediaType`, optional `pageCount`

### Checklist

- [x] `src/lib/media-type.ts` created
- [x] Types updated (`revue-tool.ts`, `comments-panel`, `fabric`, `Iteration` in canvas)
- [x] Wired in `room-content.tsx`, `revue/page.tsx`, `communication-canvas.tsx`
- [x] `npm install pdfjs-dist`
- [x] Project compiles

**Checkpoint:** Detection works; no viewer yet.

---

## Phase 3 — PDF viewer component

**New:** `src/components/communication/pdf-page-viewer.tsx`

- [ ] Props: `url`, `page` (1-based), `scale`, `rotation`, `onReady({ pageCount })`, `onError`
- [ ] PDF.js: `getDocument(url)` → `getPage(page)` → render to `<canvas>`
- [ ] Worker: `pdfjs.GlobalWorkerOptions.workerSrc` (Next: `public/pdf.worker.mjs` or documented import)
- [ ] Re-render when `url`, `page`, `scale`, `rotation` change
- [ ] Loading and error UI
- [ ] Cleanup on unmount (cancel render task)

**Concept:** imperative render in `useEffect`.

### Checklist

- [x] `npm install pdfjs-dist`
- [x] Worker at `public/pdf.worker.min.mjs`
- [x] `src/lib/pdfjs-config.ts`
- [x] `src/components/communication/pdf-page-viewer.tsx`
- [x] Wired via `creative-media-display.tsx` + `canvas-area.tsx` (page 1; pager in Phase 5)

**Checkpoint:** Open a PDF creative in Revue — page 1 renders on canvas (not a broken `<img>`).

---

## Phase 4 — Refactor `CanvasArea`

**Update:** `src/components/communication/canvas-area.tsx`

Today: fixed `<img src={imageUrl}>`.

Change to:

```tsx
{mediaType === "pdf" ? (
  <PdfPageViewer url={imageUrl} page={currentPage} ... />
) : (
  <img src={imageUrl} ... />
)}
```

- [ ] Same wrapper `ref={imageRef}` / same size box so **SVG overlay** math stays valid
- [ ] Pointer events: still on SVG for draw/comment
- [ ] Rotate: CSS `transform` on wrapper (same as now)

**New props:** `mediaType`, `currentPage`, `pageCount` (pager can live in parent only)

### Checklist

- [x] `CreativeMediaDisplay` switches image vs PDF
- [x] Same `imageRef` wrapper; SVG overlay `absolute` full size
- [x] Pointer events on SVG for draw/comment; rotate/zoom on wrapper
- [x] `pageCount` prop; layout sync for PDF canvas (`data-creative-media` + ResizeObserver)
- [x] Compare mode uses `CreativeMediaDisplay` for both sides

**Checkpoint:** Comment/draw tools align with PDF page bounds same as images.

---

## Phase 5 — Page pager UI

**Update:** `src/components/communication/communication-canvas.tsx`

- [ ] State: `currentPage = 1`, `pageCount = 1` (`onReady` from viewer sets count)
- [ ] UI: Prev / Next, **Page 4 of 12** (only when `mediaType === 'pdf'`)
- [ ] On page change: re-render PDF; filter markers and drawings by `page_number`
- [ ] On iteration switch: reset `currentPage` to `1`
- [ ] Rotation: optional reset per page (v1: keep global like today)

**Compare mode:** pass **same `currentPage`** to both sides (two `PdfPageViewer` or image + pdf).

### Checklist

- [x] `PdfPagePager` — Prev / Next, Page X of Y (PDF only, `pageCount > 1`)
- [x] Canvas markers/drawings filtered by `currentPage`
- [x] Sidebar lists all feedbacks; click jumps to that page
- [x] `page_number` saved on new feedback/drawing (PDF)
- [x] Drawings merge per page (other pages preserved in state)
- [x] Iteration switch resets `currentPage` to 1

**Checkpoint:** Comment on page 2, go to page 1 — pin hidden; pager shows page 2 again.

---

## Phase 6 — Save / load annotations

### `communication-canvas.tsx`

- [ ] `handleAddFeedback` — insert `page_number: currentPage`
- [ ] `handleDrawingsChange` — upsert with `page_number: currentPage`
- [ ] **Merge drawings on page change:** keep other pages’ drawings in state; only replace current page’s list when canvas updates
- [ ] Realtime — read `page_number`; store all; filter on display

### `revue/page.tsx`

- [ ] Select `page_number` from `feedbacks` and `drawings`
- [ ] Select `media_type`, `page_count` from `iterations`
- [ ] Infer `media_type` from URL if column missing (backward compat)

### `comments-panel.tsx`

- [ ] Badge **Page 4** on each feedback
- [ ] Click row → `setCurrentPage(4)` + highlight pin

### Checklist

- [x] `page_number` on feedback/drawing insert and load
- [x] Realtime includes `page_number`
- [x] Sidebar page labels + click → jump to page
- [x] Drawings merge per page on save

**Checkpoint:** Comment on page 3 survives reload on page 3 only.

---

## Phase 7 — Room page (upload + card)

**Update:** `src/components/room/room-content.tsx`

- [ ] On file select: if `application/pdf` → default type `document`, no image preview
- [ ] `handleAddCreative`: iteration with `media_type: 'pdf'` when file is PDF
- [ ] Card grid: if PDF URL → **no** `<img src={pdfUrl}>`; use document icon + “PDF” (+ page count if known)

**Optional later:** page-1 thumbnail (canvas → blob → storage).

### Checklist

- [x] PDF upload sets `media_type` + optional `page_count` on iteration
- [x] Room card uses `CreativeCardThumbnail` (no broken `<img>` for PDF)
- [x] `room/page.tsx` loads iteration `media_type` / `page_count` for cards
- [x] Brief page thumbnails use same component

**Checkpoint:** Upload PDF → card → Revue → pager works end-to-end.

---

## Phase 8 — Compare, rotate, AI

### Compare + rotate

- [x] Compare: both panes use `currentPage` for PDFs
- [x] Rotate on viewer wrapper (session-only is fine for v1)
- [x] Compare hint shows shared page index for multi-page PDFs

### AI analyse

- [x] **Short term:** rasterize **current PDF page** (`canvas.toDataURL` / blob) → existing image AI pipeline (`capture-creative-media.ts`)
- [ ] **Long term:** whole-document API (optional)
- [x] UI note: “Analyses current page only” (sidebar + scanning overlay)

---

## Phase 9 — Polish

- [x] Loading spinner while PDF page renders
- [x] Error state + download link if load fails
- [x] Debounce rapid page changes (180ms in `PdfPageViewer`)
- [x] Supabase public URL works with PDF.js (CORS fetch + ArrayBuffer fallback in `pdf-document-loader.ts`)
- [x] Image creatives unchanged (`CreativeMediaDisplay` still uses `<img>` for non-PDF)

---

## File change checklist

| Area | Files |
|------|--------|
| DB | `supabase/migrations/*_pdf_page_support.sql` |
| Types | `src/types/revue-tool.ts`, `comments-panel.tsx` |
| PDF core | `src/lib/media-type.ts`, `src/components/communication/pdf-page-viewer.tsx`, `public/pdf.worker.mjs` |
| Revue | `canvas-area.tsx`, `communication-canvas.tsx`, `revue/page.tsx` |
| Upload | `room-content.tsx`, new-iteration upload in `communication-canvas.tsx` |
| Room UI | Creative card branch in `room-content.tsx` |
| Deps | `package.json` — `pdfjs-dist` |

---

## Implementation order (suggested PRs)

| PR | Scope |
|----|--------|
| **PR1** | Phase 1 + Phase 2 (migration, types, `media-type.ts`, read `page_number`) |
| **PR2** | Phase 3 + 4 + 5 (PDF viewer + canvas branch + pager, read-only OK) |
| **PR3** | Phase 6 + sidebar (save/filter by page, comments panel jump) |
| **PR4** | Phase 8 compare/rotate |
| **PR5** | Phase 7 room upload + cards |
| **PR6** | Phase 8 AI + Phase 9 polish |

**Sensible first slice:** PR1 + PR2 (DB + viewer + pager; tools can follow in PR3).

---

## What stays the same

- One file per iteration in Supabase Storage (`creatives` / `revue-assets` buckets as today)
- `iterations.image_url` stores the asset URL (PDF or image)
- `x`, `y` as percentages on the visible page rectangle
- Iterations, realtime, sidebar structure
- Reference PDFs in room sidebar (iframe preview can stay separate)

---

## What’s new

- PDF.js renders **page N** instead of `<img>` for PDFs
- **`page_number`** on `feedbacks` and `drawings`
- UI state **`currentPage`** drives view and saves
- **`media_type`** / **`page_count`** on iterations (optional metadata)

---

## Next.js note

PDF.js **worker** must be configured for Next (static file in `public/` or dynamic import). Main plumbing work besides React changes.

---

## User flow (reference)

1. **Room** — Upload Creative → choose PDF → Add Creative.
2. **Room** — Card shows PDF label; click → Revue.
3. **Revue** — Page 1; pager for multi-page.
4. **Revue** — Comment/draw on current page; sidebar shows page numbers.
5. **Revue** — New iteration = new file; compare same page index across versions.

---

## Success criteria

- [ ] Multi-page PDF uploads and opens in Revue
- [ ] Pager correct; annotations on page N only visible on page N
- [ ] Reload preserves per-page comments and drawings
- [ ] Compare uses same page index on both iterations
- [ ] Image creatives unchanged
- [ ] Room card does not show broken `<img>` for PDF

---

## Manual test checklist

Use your logged-in browser (`npm run dev` → http://localhost:3000). Example URLs from a recent session:

- Room: `http://localhost:3000/room?client=af2aeecb-602a-4594-a427-80d91b40e073`
- Revue (replace `creativeId`): `http://localhost:3000/revue?projectId=dbb13cd3-b4a5-4ca9-ba43-d0d2a2f6f12d&creativeId=YOUR_CREATIVE_ID`

### A — Room upload (Phase 7)

1. Open **Room** → pick a project → **Add** creative.
2. Upload a **multi-page PDF** (3+ pages).
3. **Pass:** Card shows **PDF** label and page count (not a broken image).
4. Click card → **Open in Revue**.

### B — Revue viewer + pager (Phases 3–5)

1. PDF renders on **page 1** (not a broken `<img>`).
2. Bottom pager: **Page 1 of N**; **Next** shows page 2.
3. **Pass:** Spinner briefly while changing pages; no console errors.

### C — Per-page annotations (Phases 5–6)

1. On **page 2**: tool **Comment** → click canvas → add text → save.
2. On **page 2**: **Draw** a short stroke.
3. Go to **page 1** → comment pin and drawing from page 2 are **hidden**.
4. Back to **page 2** → both **visible**.
5. **Reload** the Revue tab → same behavior.
6. Sidebar: feedback shows **Page 2**; click it → jumps to page 2.

### D — Compare + rotate (Phase 8)

1. Need **2+ iterations** on the same creative (upload a second version if needed).
2. Press **K** (compare). Both sides show the **same page number**.
3. Change pager to page 3 → **both** panes update.
4. Press **R** → both panes rotate together.
5. Exit compare (**K**).

### E — AI (Phase 8, current page only)

1. Go to **page 2** of a multi-page PDF.
2. Sidebar **AI Analyse** → pick any analysis type.
3. **Pass:** Note says **current page only**; scanning overlay runs; mock suggestions appear.
4. (Real API not wired yet — mock results are expected.)

### F — Image regression (Phase 9)

1. Open an **image** creative (not PDF) in Revue.
2. **Pass:** Normal image preview, comments, draw, zoom — no pager, no PDF UI.

### G — DB spot-check (optional, Supabase)

After step C, in Supabase:

- `feedbacks.page_number` = 2 for that comment
- `drawings.page_number` = 2 for that stroke
- `iterations.media_type` = `pdf`, `page_count` = N

---

*Planning document only — implement phase-by-phase with explicit approval before each PR.*
