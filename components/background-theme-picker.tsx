"use client"

import { BACKGROUND_THEMES, type BackgroundThemeId } from "@/lib/particle-effects"
import { cn } from "@/lib/utils"

interface BackgroundThemePickerProps {
  value: BackgroundThemeId
  onChange: (id: BackgroundThemeId) => void
  solidColor: string
  onSolidColorChange: (hex: string) => void
  disabled?: boolean
}

export function BackgroundThemePicker({
  value,
  onChange,
  solidColor,
  onSolidColorChange,
  disabled,
}: BackgroundThemePickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted-foreground">Fondo (opcional)</span>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Elegir fondo de la transformación">
        {BACKGROUND_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(theme.id)}
            aria-pressed={value === theme.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
              value === theme.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            <span aria-hidden="true">{theme.emoji}</span>
            {theme.label}
          </button>
        ))}

        {value === "solid" && (
          <label
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
            title="Elegir color del fondo"
          >
            <span
              className="size-4 rounded-full border border-border"
              style={{ backgroundColor: solidColor }}
              aria-hidden="true"
            />
            Elegir color
            <input
              type="color"
              value={solidColor}
              disabled={disabled}
              onChange={(e) => onSolidColorChange(e.target.value)}
              aria-label="Color del fondo sólido"
              className="sr-only"
            />
          </label>
        )}
      </div>
    </div>
  )
}
