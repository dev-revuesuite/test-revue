import type { DeploymentEnvironment } from "@/lib/deployment-environment"

export type InferenceLogEndpoint = "gramcheck" | "wordspace" | "lineheight"

export function inferenceEndpointLabel(endpoint: InferenceLogEndpoint | string): string {
  switch (endpoint) {
    case "gramcheck":
      return "Spelling"
    case "wordspace":
      return "Spacing"
    case "lineheight":
      return "Line height"
    default:
      return endpoint
  }
}

export function inferenceSourceLabel(source: string): string {
  switch (source) {
    case "studio_analysis":
      return "Studio"
    case "quick_analysis":
      return "Quick analysis"
    default:
      return source
  }
}

export function deploymentEnvironmentLabel(env: DeploymentEnvironment | string): string {
  switch (env) {
    case "production":
      return "Production"
    case "staging":
      return "Staging"
    case "development":
      return "Development"
    default:
      return env
  }
}
