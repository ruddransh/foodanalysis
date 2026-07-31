"use client"

import { Loader2, ScanLine, Sparkles } from "lucide-react"

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <ScanLine className="w-10 h-10 text-primary animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles className="w-6 h-6 text-primary animate-bounce" />
        </div>
      </div>
      <div className="mt-6 text-center">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing your food...
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Our AI is identifying the food and calculating nutrition
        </p>
      </div>
    </div>
  )
}
