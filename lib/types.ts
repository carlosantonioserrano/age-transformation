export type JobStatus = "queued" | "processing" | "succeeded" | "failed"

export interface TransformJob {
  id: string
  status: JobStatus
  ageShift: number
  sourceImage: string
  resultImage?: string
  progress: number
  error?: string
  createdAt: number
  simulated: boolean
}

export interface StartTransformRequest {
  image: string
  ageShift: number
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
