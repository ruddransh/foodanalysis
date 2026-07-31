"use client"

import React from "react"

import { useState, useCallback, useRef } from "react"
import { Upload, ImageIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  onImageSelect: (file: File) => void
  isLoading: boolean
}

export function ImageUploader({ onImageSelect, isLoading }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0]
        if (file.type.startsWith("image/")) {
          setPreview(URL.createObjectURL(file))
          onImageSelect(file)
        }
      }
    },
    [onImageSelect]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault()
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0]
        setPreview(URL.createObjectURL(file))
        onImageSelect(file)
      }
    },
    [onImageSelect]
  )

  const clearPreview = useCallback(() => {
    setPreview(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }, [])

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center w-full min-h-[280px] rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden",
          dragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
          isLoading && "pointer-events-none opacity-60"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload food image"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />

        {preview ? (
          <div className="relative w-full h-full min-h-[280px]">
            <img
              src={preview || "/placeholder.svg"}
              alt="Food preview"
              className="w-full h-full object-cover absolute inset-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                clearPreview()
              }}
              className="absolute top-3 right-3 p-2 bg-card/90 rounded-full hover:bg-card transition-colors"
              aria-label="Remove image"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
            <div className="absolute bottom-4 left-4 right-4 text-center">
              <p className="text-card text-sm font-medium">Click or drop to replace</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="p-4 rounded-full bg-primary/10">
              {dragActive ? (
                <ImageIcon className="w-10 h-10 text-primary" />
              ) : (
                <Upload className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                {dragActive ? "Drop your food image here" : "Upload a food image"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Drag and drop or click to browse
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-1 bg-muted rounded">PNG</span>
              <span className="px-2 py-1 bg-muted rounded">JPG</span>
              <span className="px-2 py-1 bg-muted rounded">WEBP</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
