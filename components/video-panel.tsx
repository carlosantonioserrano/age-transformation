"use client"

import { useState } from "react"
import { Clapperboard, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateCrossfadeVideo } from "@/lib/video-generator"

interface VideoPanelProps {
  sourceImage: string
  resultImage: string
  afterFilter: string
}

export function VideoPanel({ sourceImage, resultImage, afterFilter }: VideoPanelProps) {
  const [generating, setGenerating] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const { url } = await generateCrossfadeVideo(sourceImage, resultImage, afterFilter)
      setVideoUrl(url)
    } catch {
      setError("No se pudo generar el video en este navegador.")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Clapperboard className="size-4 text-primary" aria-hidden="true" />
        <h3 className="font-heading text-base">Video de transición</h3>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Genera un clip corto con un efecto de transición (crossfade) entre la foto original y el resultado.
      </p>

      {videoUrl ? (
        <div className="flex flex-col gap-2">
          <video src={videoUrl} controls loop className="w-full rounded-md border border-border" />
          <a
            href={videoUrl}
            download="agelab-transicion.webm"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Download className="size-4" aria-hidden="true" />
            Descargar video
          </a>
        </div>
      ) : (
        <Button variant="secondary" onClick={handleGenerate} disabled={generating} className="gap-2 self-start">
          {generating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Clapperboard className="size-4" aria-hidden="true" />
          )}
          {generating ? "Generando…" : "Generar video"}
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
