"use client"

import { Flame, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HistoryRecord {
  id: number
  food_name: string
  portion_size: string
  nutritional_info: {
    calories: number
    protein: string
    carbohydrates: string
    fat: string
    fiber: string
  }
  confidence: string
  timestamp: string
}

interface HistoryItemProps {
  item: HistoryRecord
  onDelete: (id: number) => void
  isDeleting: boolean
}

export function HistoryItem({ item, onDelete, isDeleting }: HistoryItemProps) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div
      className={cn(
        "group flex items-center justify-between p-4 bg-card rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all",
        isDeleting && "opacity-50 pointer-events-none"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
          <Flame className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{item.food_name}</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-muted-foreground">{item.portion_size}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-sm font-medium text-primary">
              {item.nutritional_info.calories} kcal
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{formatDate(item.timestamp)}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(item.id)}
        disabled={isDeleting}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        aria-label="Delete history item"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}
