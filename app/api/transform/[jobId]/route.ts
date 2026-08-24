import { type NextRequest, NextResponse } from "next/server"
import { jobStore } from "@/lib/transform-store"
import type { JobStatusResponse } from "@/lib/types"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const job = jobStore.get(jobId)

  if (!job) {
    return NextResponse.json({ error: "Job no encontrado." }, { status: 404 })
  }

  const payload: JobStatusResponse = {
    id: job.id,
    status: job.status,
    progress: job.progress,
    resultImage: job.resultImage,
    error: job.error,
    simulated: job.simulated,
  }

  return NextResponse.json(payload)
}
