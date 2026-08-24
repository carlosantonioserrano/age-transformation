"use client"

import { useState } from "react"
import { Download, FlaskConical, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ComparisonSlider } from "@/components/comparison-slider"
import { getSimulatedFilter, downloadComparisonImage } from "@/lib/image-utils"

interface ResultPanelProps {
  sourceImage: string
  resultImage: string
  ageShift: number
  simulated: boolean
}

export function ResultPanel({ sourceImage, resultImage, ageShift, simulated }: ResultPanelProps) {
  const [downloading, setDownloading] = useState(false)
  const afterFilter = simulated ? getSimulatedFilter(ageShift) : "none"

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadComparisonImage(sourceImage, resultImage, afterFilter)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg">Resultado</h2>
        {simulated && (
          <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
            <FlaskConical className="size-3" aria-hidden="true" />
            Modo simulación
          </Badge>
        )}
      </div>

      <ComparisonSlider beforeImage={sourceImage} afterImage={resultImage} afterFilter={afterFilter} />

      {simulated && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          La transformación se ejecuta con el modelo de edad configurado en el servidor.
        </p>
      )}

      <Button onClick={handleDownload} disabled={downloading} className="gap-2 self-start">
        {downloading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        Descargar comparación
      </Button>
    </div>
  )
}
