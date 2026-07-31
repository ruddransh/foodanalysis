"use client"

import { useState, useEffect, useCallback } from "react"
import { Utensils, AlertCircle } from "lucide-react"
import { ImageUploader } from "@/components/image-uploader"
import { NutritionCard } from "@/components/nutrition-card"
import { HistoryPanel } from "@/components/history-panel"
import { LoadingState } from "@/components/loading-state"
import { Alert, AlertDescription } from "@/components/ui/alert"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface NutritionalInfo {
  calories: number
  protein: string
  carbohydrates: string
  fat: string
  fiber: string
}

interface FoodAnalysis {
  food_name: string
  ingredients: string[]
  portion_size: string
  nutritional_info: NutritionalInfo
  confidence: string
  notes: string
  from_history?: boolean
  analyzed_date?: string
}

interface HistoryRecord {
  id: number
  food_name: string
  portion_size: string
  nutritional_info: NutritionalInfo
  confidence: string
  timestamp: string
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysis | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/history`)
      const data = await response.json()
      if (data.success) {
        setHistory(data.history)
      }
    } catch (err) {
      console.log("[v0] Failed to fetch history:", err)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleImageSelect = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setAnalysisResult(null)

    const formData = new FormData()
    formData.append("image", file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze-food`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze food")
      }

      if (data.success) {
        setAnalysisResult(data.data)
        setFromCache(data.from_cache || false)
        fetchHistory()
      } else {
        throw new Error(data.error || "Analysis failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteHistory = async (id: number) => {
    setDeletingId(id)
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/${id}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        setHistory((prev) => prev.filter((item) => item.id !== id))
      }
    } catch (err) {
      console.log("[v0] Failed to delete history item:", err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/clear`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        setHistory([])
      }
    } catch (err) {
      console.log("[v0] Failed to clear history:", err)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">NutriScan</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Food Analysis</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">Upload Food Image</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Drop or upload an image of your food to get instant nutritional analysis
                </p>
              </div>
              <ImageUploader onImageSelect={handleImageSelect} isLoading={isLoading} />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading && (
              <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
                <LoadingState />
              </div>
            )}

            {analysisResult && !isLoading && (
              <NutritionCard data={analysisResult} fromCache={fromCache} />
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <HistoryPanel
                history={history}
                onDelete={handleDeleteHistory}
                onClearAll={handleClearHistory}
                onRefresh={fetchHistory}
                isLoading={historyLoading}
                deletingId={deletingId}
              />
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-border/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Powered by AI • Nutritional values are estimates
          </p>
        </div>
      </footer>
    </main>
  )
}
