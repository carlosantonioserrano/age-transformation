import { Sparkles } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-heading text-lg">AgeLab</span>
            <span className="font-mono text-[11px] text-muted-foreground">simulador de edad · IA</span>
          </div>
        </div>
        <span className="hidden font-mono text-xs text-muted-foreground sm:inline">v0.1 · demo</span>
      </div>
    </header>
  )
}
