"use client"

import { useCallback, useRef, useState } from "react"
import Webcam from "react-webcam"
import { Camera, RotateCcw, Upload, VideoOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WebcamCaptureProps {
  image: string | null
  onCapture: (image: string) => void
  onReset: () => void
}

export function WebcamCapture({ image, onCapture, onReset }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  const handleCapture = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot()
    if (screenshot) onCapture(screenshot)
  }, [onCapture])

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") onCapture(reader.result)
      }
      reader.readAsDataURL(file)
      event.target.value = ""
    },
    [onCapture],
  )

  if (image) {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Foto capturada del usuario" className="h-full w-full object-cover" />
        </div>
        <Button variant="secondary" onClick={onReset} className="gap-2">
          <RotateCcw className="size-4" aria-hidden="true" />
          Volver a tomar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
        {!cameraError ? (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            className="h-full w-full object-cover"
            onUserMedia={() => setCameraReady(true)}
            onUserMediaError={() => setCameraError(true)}
            mirrored
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
            <VideoOff className="size-8" aria-hidden="true" />
            <p className="text-sm">No se pudo acceder a la cámara. Usa &quot;Subir imagen&quot;.</p>
          </div>
        )}
        {!cameraError && (
          <div className="absolute inset-3 rounded-md border border-dashed border-foreground/20" aria-hidden="true" />
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={handleCapture} disabled={cameraError || !cameraReady} className="flex-1 gap-2">
          <Camera className="size-4" aria-hidden="true" />
          Tomar foto
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2">
          <Upload className="size-4" aria-hidden="true" />
          Subir imagen local
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileUpload}
        aria-label="Subir imagen local"
      />
    </div>
  )
}
