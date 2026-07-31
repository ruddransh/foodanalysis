"use client"

import { useState } from "react"
import { History, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HistoryItem } from "./history-item"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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

interface HistoryPanelProps {
  history: HistoryRecord[]
  onDelete: (id: number) => void
  onClearAll: () => void
  onRefresh: () => void
  isLoading: boolean
  deletingId: number | null
}

export function HistoryPanel({
  history,
  onDelete,
  onClearAll,
  onRefresh,
  isLoading,
  deletingId,
}: HistoryPanelProps) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <History className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Analysis History</h3>
            <p className="text-xs text-muted-foreground">{history.length} items</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your food analysis history. This action cannot
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onClearAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="p-4 max-h-[500px] overflow-y-auto">
        {isLoading && history.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <History className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No analysis history yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a food image to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                onDelete={onDelete}
                isDeleting={deletingId === item.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
