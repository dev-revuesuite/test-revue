export type DeploymentEnvironment = "production" | "staging" | "development"

/** Where this deployment runs (for AI log filtering). */
export function getDeploymentEnvironment(): DeploymentEnvironment {
  const vercelEnv = process.env.VERCEL_ENV?.trim()
  if (vercelEnv === "production") return "production"
  if (vercelEnv === "preview") return "staging"

  if (process.env.NODE_ENV === "production") {
    return "production"
  }

  return "development"
}
