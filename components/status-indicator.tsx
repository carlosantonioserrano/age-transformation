import { Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export type PipelineStage = "idle" | "uploading" | "processing" | "rendering" | "done" | "error"

const STAGE_LABELS: Record<PipelineStage, string> = {
  idle: "",
  uploading: "Subiendo foto…",
  processing: "Procesando con IA…",
  rendering: "Generando render final…",
  done: "Transformación completa",
  error: "Ocurrió un error",
}

interface StatusIndicatorProps {
  stage: PipelineStage
  progress: number
}

export function StatusIndicator({ stage, progress }: StatusIndicatorProps) {
  if (stage === "idle") return null

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-3">
      <div className="flex items-center gap-2 text-sm">
        {stage !== "done" && stage !== "error" && (
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        )}
        <span className={stage === "error" ? "text-destructive" : "text-foreground"}>{STAGE_LABELS[stage]}</span>
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">{progress}%</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  )
}
