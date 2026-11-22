import { createHash, createHmac } from "node:crypto"

/**
 * Request signing for the REVUE page-check API (gateway-contract.md, section 5).
 *
 * The signed text is five lines joined by "\n" (no trailing newline):
 *   v1, the X-Revue-Time value, the method in upper case, the path as requested,
 *   and the lower-case hex SHA-256 of the exact body bytes sent.
 */
export interface RevueSignatureInput {
  secret: string
  /** Unix time in seconds. */
  time: number
  method: string
  /** Path exactly as requested, e.g. "/wordspace/". */
  path: string
  /** Exactly the bytes that are sent as the request body. */
  body: Uint8Array
}

export interface RevueSignature {
  bodyHash: string
  signature: string
}

export function signRevueRequest({
  secret,
  time,
  method,
  path,
  body,
}: RevueSignatureInput): RevueSignature {
  const bodyHash = createHash("sha256").update(body).digest("hex")
  const text = ["v1", String(time), method.toUpperCase(), path, bodyHash].join("\n")
  const signature = createHmac("sha256", secret).update(text).digest("hex")
  return { bodyHash, signature }
}
