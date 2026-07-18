'use client'

import React, { useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { PlaceImage } from './types'
import { RADIUS, BORDER, TEXT_MUTED } from '@/lib/theme'

interface PlaceImageGalleryProps {
  images: PlaceImage[]
  onAdd: (file: File) => Promise<void>
  onDelete: (imageId: string) => void
}

export function PlaceImageGallery({ images, onAdd, onDelete }: PlaceImageGalleryProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await onAdd(file)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {images.map((img) => (
        <div key={img.id} className={`relative w-14 h-14 ${RADIUS} ${BORDER} overflow-hidden group/img flex-shrink-0`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onDelete(img.id)}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      ))}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`w-14 h-14 ${RADIUS} ${BORDER} border-dashed flex items-center justify-center ${TEXT_MUTED} hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors disabled:opacity-50 flex-shrink-0`}
        title="Bild hinzufügen"
      >
        {uploading ? '…' : <Plus size={18} />}
      </button>
    </div>
  )
}
