"use client"

import { Slider } from "@/components/ui/slider"

interface AgeSliderProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

function getLabel(value: number) {
  if (value === 0) return "Sin cambios"
  if (value > 0) return `Envejecer ${value} años`
  return `Rejuvenecer ${Math.abs(value)} años`
}

export function AgeSlider({ value, onChange, disabled }: AgeSliderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">Ajuste de edad</span>
        <span className="font-heading text-lg text-primary tabular-nums">{getLabel(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={-50}
        max={50}
        step={1}
        disabled={disabled}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        aria-label="Ajuste de edad en años"
      />
      <div className="flex justify-between text-xs font-mono text-muted-foreground">
        <span>-50 (más joven)</span>
        <span>0</span>
        <span>+50 (más mayor)</span>
      </div>
    </div>
  )
}
