import type { TransformJob } from "./types"

const globalForJobs = globalThis as unknown as {
  __transformJobs?: Map<string, TransformJob>
}

export const jobStore: Map<string, TransformJob> =
  globalForJobs.__transformJobs ?? new Map()

globalForJobs.__transformJobs = jobStore

export function createJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function isProviderConfigured() {
  return Boolean(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY)
}
