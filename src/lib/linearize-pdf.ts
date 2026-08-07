import path from "node:path"

import type { QpdfInstance } from "@neslinesli93/qpdf-wasm"

export class PdfLinearizeError extends Error {
  constructor(
    message: string,
    readonly status = 500
  ) {
    super(message)
    this.name = "PdfLinearizeError"
  }
}

type QpdfFs = {
  writeFile: (path: string, data: Uint8Array) => void
  readFile: (path: string) => Uint8Array
  unlink: (path: string) => void
}

function getQpdfFs(qpdf: QpdfInstance): QpdfFs {
  return qpdf.FS as unknown as QpdfFs
}

/**
 * A fresh instance per call: Emscripten memory only grows, so a cached module
 * would pin the peak (input + output) allocation of the largest PDF forever.
 */
async function createQpdfModule(): Promise<QpdfInstance> {
  const createModule = (await import("@neslinesli93/qpdf-wasm")).default
  const wasmPath = path.join(
    process.cwd(),
    "node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm"
  )

  return createModule({
    locateFile: () => wasmPath,
  })
}

/** Fast check for qpdf's fast-web-view marker in the file header. */
export function isPdfAlreadyLinearized(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096))
  return sample.toString("latin1").includes("/Linearized")
}

export async function linearizePdfBuffer(input: Buffer): Promise<Buffer> {
  if (input.byteLength === 0) {
    throw new PdfLinearizeError("PDF is empty", 400)
  }

  if (isPdfAlreadyLinearized(input)) {
    return input
  }

  const qpdf = await createQpdfModule()
  const fs = getQpdfFs(qpdf)
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const inputPath = `/linearize-in-${token}.pdf`
  const outputPath = `/linearize-out-${token}.pdf`

  try {
    fs.writeFile(inputPath, new Uint8Array(input))
    const exitCode = qpdf.callMain([inputPath, "--linearize", outputPath])

    if (exitCode !== 0) {
      throw new PdfLinearizeError(`Linearization failed (code ${exitCode})`)
    }

    return Buffer.from(fs.readFile(outputPath))
  } finally {
    try {
      fs.unlink(inputPath)
    } catch {
      // ignore cleanup errors
    }
    try {
      fs.unlink(outputPath)
    } catch {
      // ignore cleanup errors
    }
  }
}
