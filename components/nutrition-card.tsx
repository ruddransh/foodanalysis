"use client"

import { Flame, Beef, Wheat, Droplets, Leaf, Info, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

interface NutritionCardProps {
  data: FoodAnalysis
  fromCache?: boolean
}

export function NutritionCard({ data, fromCache }: NutritionCardProps) {
  const getConfidenceBadge = (confidence: string) => {
    const styles = {
      high: "bg-green-100 text-green-800 border-green-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-red-100 text-red-800 border-red-200",
    }
    return styles[confidence as keyof typeof styles] || styles.medium
  }

  const nutritionItems = [
    {
      label: "Calories",
      value: data.nutritional_info.calories,
      unit: "kcal",
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      label: "Protein",
      value: data.nutritional_info.protein,
      unit: "g",
      icon: Beef,
      color: "text-red-500",
      bgColor: "bg-red-50",
    },
    {
      label: "Carbs",
      value: data.nutritional_info.carbohydrates,
      unit: "g",
      icon: Wheat,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      label: "Fat",
      value: data.nutritional_info.fat,
      unit: "g",
      icon: Droplets,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "Fiber",
      value: data.nutritional_info.fiber,
      unit: "g",
      icon: Leaf,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
  ]

  return (
    <Card className="overflow-hidden border-border/50 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold text-foreground text-balance">
              {data.food_name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{data.portion_size}</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge
              variant="outline"
              className={getConfidenceBadge(data.confidence)}
            >
              {data.confidence} confidence
            </Badge>
            {fromCache && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Cached
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {nutritionItems.map((item) => (
            <div
              key={item.label}
              className={`flex flex-col items-center p-4 rounded-xl ${item.bgColor} transition-transform hover:scale-105`}
            >
              <item.icon className={`w-6 h-6 ${item.color} mb-2`} />
              <span className="text-2xl font-bold text-foreground">{item.value}</span>
              <span className="text-xs text-muted-foreground">{item.unit}</span>
              <span className="text-xs font-medium text-foreground mt-1">{item.label}</span>
            </div>
          ))}
        </div>

        {data.ingredients && data.ingredients.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Ingredients
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.ingredients.map((ingredient, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {ingredient}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.notes && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{data.notes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
