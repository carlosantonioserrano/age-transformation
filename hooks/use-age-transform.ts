"use client"

import { useState } from "react"

export type Stage = "idle" | "uploading" | "processing" | "rendering" | "done" | "error"

export function useAgeTransform() {
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [ageShift, setAgeShift] = useState<number>(20)
  const [stage, setStage] = useState<Stage>("idle")
  const [progress, setProgress] = useState<number>(0)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Forzamos simulated a false para deshabilitar el modo mock
  const simulated = false

  const startTransform = async () => {
    if (!sourceImage) return

    setStage("uploading")
    setProgress(10)
    setError(null)

    try {
      setStage("processing")
      setProgress(40)

      // Llamada real al endpoint de Next.js
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: sourceImage,
          ageShift,
        }),
      })

      setProgress(80)

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error al procesar la imagen con IA.")
      }

      setResultImage(data.resultImage)
      setStage("done")
      setProgress(100)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Error inesperado al conectar con el servidor.")
      setStage("error")
    }
  }

  const resetResult = () => {
    setResultImage(null)
    setStage("idle")
    setProgress(0)
    setError(null)
  }

  const reset = () => {
    setSourceImage(null)
    resetResult()
  }

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
