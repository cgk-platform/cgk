/**
 * Signature Capture Component
 *
 * Allows users to draw, type, or upload their signature.
 * Uses canvas for drawing with a natural pen feel.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, CardContent, cn, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@cgk-platform/ui'
import { Check, Eraser, Pencil, Type, Upload, X, RotateCcw } from 'lucide-react'

export type SignatureMethod = 'draw' | 'type' | 'upload'

export interface SignatureCaptureProps {
  onSignatureCapture: (dataUrl: string, method: SignatureMethod, fontName?: string) => void
  onCancel?: () => void
  initialMethod?: SignatureMethod
  signerName?: string
  canvasWidth?: number
  canvasHeight?: number
  className?: string
}

const SIGNATURE_FONTS = [
  { name: 'Dancing Script', family: "'Dancing Script', cursive", url: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap' },
  { name: 'Great Vibes', family: "'Great Vibes', cursive", url: 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap' },
  { name: 'Alex Brush', family: "'Alex Brush', cursive", url: 'https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap' },
  { name: 'Pacifico', family: "'Pacifico', cursive", url: 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap' },
]

export function SignatureCapture({
  onSignatureCapture,
  onCancel,
  initialMethod = 'draw',
  signerName = '',
  canvasWidth = 500,
  canvasHeight = 200,
  className,
}: SignatureCaptureProps) {
  const [method, setMethod] = useState<SignatureMethod>(initialMethod)
  const [typedName, setTypedName] = useState(signerName)
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0])
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [fontsLoaded, setFontsLoaded] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load fonts
  useEffect(() => {
    const loadFonts = async () => {
      const fontPromises = SIGNATURE_FONTS.map(async (font) => {
        const link = document.createElement('link')
        link.href = font.url
        link.rel = 'stylesheet'
        document.head.appendChild(link)
        await document.fonts.load(`48px ${font.family}`)
      })
      await Promise.all(fontPromises)
      setFontsLoaded(true)
    }
    loadFonts()
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return

    // Draw parchment-like background
    context.fillStyle = '#fefcf3'
    context.fillRect(0, 0, canvasWidth, canvasHeight)

    // Draw subtle baseline
    context.strokeStyle = '#e5e7eb'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(20, canvasHeight - 40)
    context.lineTo(canvasWidth - 20, canvasHeight - 40)
    context.stroke()

    // Reset stroke style
    context.strokeStyle = '#1a1a1a'
    context.lineWidth = 2
    setHasDrawn(false)
  }, [canvasWidth, canvasHeight])

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    canvas.width = canvasWidth * 2
    canvas.height = canvasHeight * 2
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`

    const context = canvas.getContext('2d')
    if (context) {
      context.scale(2, 2)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle = '#1a1a1a'
      context.lineWidth = 2
      contextRef.current = context
      clearCanvas()
    }
  }, [canvasWidth, canvasHeight, clearCanvas])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height

    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return null
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e)
    if (!coords || !contextRef.current) return

    contextRef.current.beginPath()
    contextRef.current.moveTo(coords.x, coords.y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !contextRef.current) return

    const coords = getCoordinates(e)
    if (!coords) return

    contextRef.current.lineTo(coords.x, coords.y)
    contextRef.current.stroke()
    setHasDrawn(true)
  }

  const stopDrawing = () => {
    if (contextRef.current) {
      contextRef.current.closePath()
    }
    setIsDrawing(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PNG, JPEG, or WebP image.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (method === 'draw') {
      if (!canvasRef.current || !hasDrawn) return
      const dataUrl = canvasRef.current.toDataURL('image/png')
      onSignatureCapture(dataUrl, 'draw')
    } else if (method === 'type') {
      if (!typedName.trim()) return
      // Create canvas with typed signature
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth * 2
      canvas.height = canvasHeight * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.scale(2, 2)
      ctx.fillStyle = '#fefcf3'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      ctx.fillStyle = '#1a1a1a'
      ctx.font = `48px ${selectedFont?.family || 'cursive'}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(typedName, canvasWidth / 2, canvasHeight / 2)

      const dataUrl = canvas.toDataURL('image/png')
      onSignatureCapture(dataUrl, 'type', selectedFont?.name)
    } else if (method === 'upload') {
      if (!uploadedImage) return
      onSignatureCapture(uploadedImage, 'upload')
    }
  }

  const isValid = method === 'draw'
    ? hasDrawn
    : method === 'type'
      ? typedName.trim().length > 0 && fontsLoaded
      : !!uploadedImage

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardContent className="p-6">
        <Tabs value={method} onValueChange={(v) => setMethod(v as SignatureMethod)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="draw" className="gap-2">
              <Pencil className="h-4 w-4" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="gap-2">
              <Type className="h-4 w-4" />
              Type
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <div className="space-y-4">
              <div
                className={cn(
                  'relative overflow-hidden rounded-lg border-2 border-dashed',
                  'border-slate-300 dark:border-slate-700',
                  'cursor-crosshair touch-none'
                )}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full"
                />
                {!hasDrawn && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <p className="text-sm text-slate-400">
                      Draw your signature above
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearCanvas}
                  className="gap-1.5"
                >
                  <Eraser className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="type" className="mt-4">
            <div className="space-y-4">
              <div>
                <Input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Type your full name"
                  className="text-lg"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Select a signature style:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SIGNATURE_FONTS.map((font) => (
                    <button
                      key={font.name}
                      type="button"
                      onClick={() => setSelectedFont(font)}
                      className={cn(
                        'rounded-lg border-2 p-4 text-center transition-all',
                        selectedFont?.name === font.name
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                      )}
                    >
                      <span
                        className="text-2xl"
                        style={{ fontFamily: font.family }}
                      >
                        {typedName || 'Your Name'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {typedName && (
                <div
                  className={cn(
                    'mt-4 rounded-lg p-6 text-center',
                    'bg-[#fefcf3] border border-slate-200'
                  )}
                >
                  <p className="text-sm text-slate-500 mb-2">Preview:</p>
                  <p
                    className="text-4xl"
                    style={{ fontFamily: selectedFont?.family || 'cursive' }}
                  >
                    {typedName}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              {uploadedImage ? (
                <div className="relative">
                  <div
                    className={cn(
                      'rounded-lg p-4 flex items-center justify-center',
                      'bg-[#fefcf3] border border-slate-200'
                    )}
                  >
                    <img
                      src={uploadedImage}
                      alt="Uploaded signature"
                      className="max-h-32 object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadedImage(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    className="absolute top-2 right-2 h-8 w-8 p-0"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'w-full rounded-lg border-2 border-dashed p-8',
                    'border-slate-300 dark:border-slate-700',
                    'hover:border-slate-400 dark:hover:border-slate-600',
                    'transition-colors duration-200',
                    'flex flex-col items-center justify-center gap-2'
                  )}
                >
                  <Upload className="h-8 w-8 text-slate-400" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Click to upload your signature image
                  </p>
                  <p className="text-xs text-slate-400">
                    PNG, JPEG, or WebP (max 2MB)
                  </p>
                </button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="gap-1.5"
          >
            <Check className="h-4 w-4" />
            Apply Signature
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
