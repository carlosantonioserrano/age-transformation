"use client"

import { useEffect, useState } from "react"
import { Palette } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const THEMES = [
  { id: "amber", label: "Ámbar", swatch: "oklch(0.76 0.14 66)" },
  { id: "violet", label: "Violeta", swatch: "oklch(0.72 0.16 300)" },
  { id: "emerald", label: "Esmeralda", swatch: "oklch(0.72 0.15 150)" },
] as const

type ThemeId = (typeof THEMES)[number]["id"]

const STORAGE_KEY = "agelab-theme"

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("amber")

  // Lee la preferencia guardada del navegador al montar (evita desajuste
  // entre el render del servidor, que siempre parte de "amber", y el cliente).
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null
    if (saved && THEMES.some((t) => t.id === saved)) {
      setTheme(saved)
      document.documentElement.setAttribute("data-app-theme", saved)
    }
  }, [])

  const applyTheme = (id: ThemeId) => {
    setTheme(id)
    document.documentElement.setAttribute("data-app-theme", id)
    window.localStorage.setItem(STORAGE_KEY, id)
  }

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Selector de tema">
      <Palette className="size-3.5 text-muted-foreground" aria-hidden="true" />
      {THEMES.map((t) => (
        <Tooltip key={t.id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => applyTheme(t.id)}
              aria-label={`Tema ${t.label}`}
              aria-pressed={theme === t.id}
              className={cn(
                "size-5 rounded-full border transition-all",
                theme === t.id
                  ? "border-foreground ring-2 ring-ring ring-offset-2 ring-offset-background"
                  : "border-border hover:scale-110",
              )}
              style={{ backgroundColor: t.swatch }}
            />
          </TooltipTrigger>
          <TooltipContent>{t.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
