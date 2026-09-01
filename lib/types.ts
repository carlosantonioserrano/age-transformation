export type JobStatus = "queued" | "processing" | "succeeded" | "failed"

export interface TransformJob {
  id: string
  status: JobStatus
  /** Absolute target age (1-100) sent to the age-transformation model. */
  targetAge: number
  sourceImage: string
  resultImage?: string
  progress: number
  error?: string
  createdAt: number
  simulated: boolean
  /** Replicate prediction id, present only for real (non-simulated) jobs. */
  externalId?: string
}

export interface StartTransformRequest {
  image: string
  /** Absolute target age (1-100), not a relative shift. */
  targetAge: number
}

export interface StartTransformResponse {
  jobId: string
}

export interface JobStatusResponse {
  id: string
  status: JobStatus
  progress: number
  resultImage?: string
  error?: string
  simulated: boolean
}
