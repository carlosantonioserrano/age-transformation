"use client"

import { useCallback, useRef, useState } from "react"
import type { PipelineStage } from "@/components/status-indicator"
import type { JobStatusResponse, StartTransformResponse } from "@/lib/types"

const POLL_INTERVAL_MS = 1200

export function useAgeTransform() {
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [ageShift, setAgeShift] = useState(20)
  const [stage, setStage] = useState<PipelineStage>("idle")
  const [progress, setProgress] = useState(0)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [simulated, setSimulated] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const poll = useCallback(
    (jobId: string) => {
      const tick = async () => {
        try {
          const res = await fetch(`/api/transform/${jobId}`)
          if (!res.ok) {
            const payload = await res.json().catch(() => null)
            throw new Error(payload?.error ?? "No se pudo consultar el estado del trabajo.")
          }
          const data: JobStatusResponse = await res.json()

          setProgress(data.progress)
          setSimulated(data.simulated)

          if (data.status === "succeeded" && data.resultImage) {
            setResultImage(data.resultImage)
            setStage("done")
            return
          }
          if (data.status === "failed") {
            setError(data.error ?? "La transformación falló.")
            setStage("error")
            return
          }

          setStage(data.progress < 50 ? "processing" : "rendering")
          pollRef.current = setTimeout(tick, POLL_INTERVAL_MS)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Se perdió la conexión con el servidor.")
          setStage("error")
        }
      }
      tick()
    },
    [],
  )

  const startTransform = useCallback(async () => {
    if (!sourceImage) return
    clearPolling()
    setError(null)
    setResultImage(null)
    setStage("uploading")
    setProgress(0)

    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: sourceImage, ageShift }),
      })
      if (!res.ok) throw new Error("No se pudo iniciar la transformación.")
      const data: StartTransformResponse = await res.json()
      setStage("processing")
      poll(data.jobId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la transformación.")
      setStage("error")
    }
  }, [sourceImage, ageShift, clearPolling, poll])

  const reset = useCallback(() => {
    clearPolling()
    setSourceImage(null)
    setStage("idle")
    setProgress(0)
    setResultImage(null)
    setError(null)
  }, [clearPolling])

  const resetResult = useCallback(() => {
    clearPolling()
    setStage("idle")
    setProgress(0)
    setResultImage(null)
    setError(null)
  }, [clearPolling])

  return {
    sourceImage,
    setSourceImage,
    ageShift,
    setAgeShift,
    stage,
    progress,
    resultImage,
    simulated,
    error,
    startTransform,
    reset,
    resetResult,
  }
}
