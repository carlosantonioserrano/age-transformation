"use client"

import { Slider } from "@/components/ui/slider"

interface AgeSliderProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function AgeSlider({ value, onChange, disabled }: AgeSliderProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-muted-foreground">Edad de destino</span>
        <span className="font-heading text-lg text-primary tabular-nums">{value} años</span>
      </div>
      <Slider
        value={[value]}
        min={1}
        max={100}
        step={5}
        disabled={disabled}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        aria-label="Edad de destino en años"
      />
      <div className="flex justify-between text-xs font-mono text-muted-foreground">
        <span>1 (bebé)</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  )
}
