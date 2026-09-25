import Image from "next/image"
import { ThemeSwitcher } from "@/components/theme-switcher"

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center overflow-hidden rounded-md">
            <Image
              src="/facetime_logo_32x32.svg"
              alt="Logo Facetime"
              width={32}
              height={32}
              className="size-8 object-cover"
              priority
            />
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-heading text-lg">Facetime</span>
            <span className="font-mono text-[11px] text-muted-foreground">simulador de edad · IA</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">v2.1</span>
        </div>
      </div>
    </header>
  )
}
