import { type NextRequest, NextResponse } from "next/server"
import { jobStore } from "@/lib/transform-store"
import type { JobStatusResponse } from "@/lib/types"

// Rough progress estimate while Replicate is still working, since its API
// doesn't report a numeric percentage — only a coarse status string.
const REPLICATE_STATUS_PROGRESS: Record<string, number> = {
  starting: 15,
  processing: 60,
}

async function pollReplicate(jobId: string, externalId: string) {
  const token = process.env.REPLICATE_API_KEY
  const job = jobStore.get(jobId)
  if (!job || !token) return

  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${externalId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error("Replicate: fallo al consultar la predicción", response.status, detail)
      job.status = "failed"
      job.error = "No se pudo consultar el estado de la transformación en Replicate."
      jobStore.set(jobId, job)
      return
    }

    const data = await response.json()

    switch (data.status) {
      case "succeeded": {
        // Replicate returns either a single URL or an array of output URLs
        // depending on the model version; normalize to a single string.
        const output = Array.isArray(data.output) ? data.output[0] : data.output
        if (!output) {
          job.status = "failed"
          job.error = "Replicate no devolvió una imagen de resultado."
        } else {
          job.status = "succeeded"
          job.progress = 100
          job.resultImage = output
        }
        break
      }
      case "failed":
      case "canceled": {
        job.status = "failed"
        job.error = data.error ? String(data.error) : "La transformación en Replicate falló."
        break
      }
      default: {
        // "starting" or "processing": keep polling from the client.
        job.status = "processing"
        job.progress = Math.max(job.progress, REPLICATE_STATUS_PROGRESS[data.status] ?? job.progress)
      }
    }

    jobStore.set(jobId, job)
  } catch (err) {
    console.error("Replicate: error de red al consultar la predicción", err)
    job.status = "failed"
    job.error = "Se perdió la conexión con Replicate."
    jobStore.set(jobId, job)
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const job = jobStore.get(jobId)

  if (!job) {
    return NextResponse.json({ error: "Job no encontrado." }, { status: 404 })
  }

  // Real (non-simulated) jobs don't advance on their own — each status poll
  // from the client fetches the latest state directly from Replicate.
  if (job.externalId && job.status !== "succeeded" && job.status !== "failed") {
    await pollReplicate(jobId, job.externalId)
  }

  const refreshed = jobStore.get(jobId) ?? job

  const payload: JobStatusResponse = {
    id: refreshed.id,
    status: refreshed.status,
    progress: refreshed.progress,
    resultImage: refreshed.resultImage,
    error: refreshed.error,
    simulated: refreshed.simulated,
  }

  return NextResponse.json(payload)
}
