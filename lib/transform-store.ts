import type { TransformJob } from "./types"

// In-memory store for mock/dev job tracking. In production this would be
// replaced by a real queue/database (e.g. Redis, Postgres) shared across
// serverless invocations.
const globalForJobs = globalThis as unknown as {
  __transformJobs?: Map<string, TransformJob>
}

export const jobStore: Map<string, TransformJob> =
  globalForJobs.__transformJobs ?? new Map()

globalForJobs.__transformJobs = jobStore

export function createJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const MOCK_STEPS = [
  { at: 300, progress: 15, status: "processing" as const },
  { at: 1000, progress: 45, status: "processing" as const },
  { at: 1800, progress: 75, status: "processing" as const },
  { at: 3000, progress: 100, status: "succeeded" as const },
]

/**
 * Simulates an async AI transformation job. Advances the job through
 * queued -> processing -> succeeded over ~3 seconds, mirroring the shape
 * of a real provider job so the frontend never needs to
 * change when a real provider is wired in.
 */
export function runMockJob(jobId: string) {
  for (const step of MOCK_STEPS) {
    setTimeout(() => {
      const job = jobStore.get(jobId)
      if (!job) return
      job.progress = step.progress
      job.status = step.status
      if (step.status === "succeeded") {
        // The mock has no real inference backend, so it echoes the source
        // image back as the "result" — the UI clearly labels this as
        // simulated output when no provider API key is configured.
        job.resultImage = job.sourceImage
      }
      jobStore.set(jobId, job)
    }, step.at)
  }
}

export function isProviderConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}

/**
 * Marks a job as failed and stores the error message. Available for any
 * provider-integration path (e.g. Gemini) to use when a request errors out.
 */
export function failJob(jobId: string, message: string) {
  const job = jobStore.get(jobId)
  if (!job) return
  job.status = "failed"
  job.error = message
  jobStore.set(jobId, job)
}
