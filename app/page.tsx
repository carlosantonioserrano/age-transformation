"use client"

import { AlertTriangle, Wand2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { WebcamCapture } from "@/components/webcam-capture"
import { AgeSlider } from "@/components/age-slider"
import { StatusIndicator } from "@/components/status-indicator"
import { ResultPanel } from "@/components/result-panel"
import { VideoPanel } from "@/components/video-panel"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAgeTransform } from "@/hooks/use-age-transform"
import { getSimulatedFilter } from "@/lib/image-utils"

export default function Page() {
  const {
    sourceImage,
    setSourceImage,
    targetAge,
    setTargetAge,
    stage,
    progress,
    resultImage,
    simulated,
    error,
    startTransform,
    reset,
    resetResult,
  } = useAgeTransform()

  const isBusy = stage === "uploading" || stage === "processing" || stage === "rendering"

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-balance text-3xl sm:text-4xl">Mira cómo cambiarías con la edad</h1>
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            Toma una foto o sube una imagen, elige la edad a la que quieres transformarte, y genera una comparación
            visual junto con un video de transición.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          <section className="flex flex-col gap-5 rounded-lg border border-border bg-card p-4 sm:p-5">
            <h2 className="font-heading text-lg">1. Captura tu foto</h2>
            <WebcamCapture
              image={sourceImage}
              onCapture={(img) => {
                setSourceImage(img)
                resetResult()
              }}
              onReset={() => {
                setSourceImage(null)
                resetResult()
              }}
            />
          </section>

          <section className="flex flex-col gap-5 rounded-lg border border-border bg-card p-4 sm:p-5">
            <h2 className="font-heading text-lg">2. Ajusta el parámetro</h2>
            <AgeSlider value={targetAge} onChange={setTargetAge} disabled={isBusy} />

            <Button
              onClick={startTransform}
              disabled={!sourceImage || isBusy}
              size="lg"
              className="mt-auto gap-2"
            >
              <Wand2 className="size-4" aria-hidden="true" />
              Generar transformación
            </Button>

            <StatusIndicator stage={stage} progress={progress} />

            {stage === "error" && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" aria-hidden="true" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </section>
        </div>

        {stage === "done" && sourceImage && resultImage && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
              <ResultPanel
                sourceImage={sourceImage}
                resultImage={resultImage}
                targetAge={targetAge}
                simulated={simulated}
              />
            </div>
            <VideoPanel
              sourceImage={sourceImage}
              resultImage={resultImage}
              afterFilter={simulated ? getSimulatedFilter(targetAge) : "none"}
            />
          </section>
        )}
      </div>
    </main>
  )
}
