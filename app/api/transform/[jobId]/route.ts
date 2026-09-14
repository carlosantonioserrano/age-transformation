import { type NextRequest, NextResponse } from "next/server"
import { jobStore } from "@/lib/transform-store"
import type { JobStatusResponse } from "@/lib/types"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const job = jobStore.get(jobId)

  if (!job) {
    return NextResponse.json({ error: "Job no encontrado." }, { status: 404 })
  }

  // Con Gemini ("nano banana") ya no hay nada externo que consultar: la
  // llamada en POST /api/transform es síncrona y deja el job resuelto
  // (succeeded/failed) de una vez. Esta ruta solo devuelve el estado actual,
  // igual que antes hacía con los jobs simulados mientras avanzaban.
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
