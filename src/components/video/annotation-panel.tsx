'use client';
import { type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PenTool,
  Eye,
  Minus,
  ChevronRight,
  CircleDot,
  Type,
  Check,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatTimeMs, ANNOTATION_COLORS } from '@/components/video/video-types';
import type { Annotation, AnnotationTool, AnnotationColor } from '@/components/video/video-types';

interface AnnotationPanelProps {
  videoRef: RefObject<HTMLVideoElement | null>
  annotations: Annotation[]
  visibleAnnotationIds: string[]
  showAnnotationTools: boolean
  setShowAnnotationTools: (v: boolean) => void
  showAnnotations: boolean
  setShowAnnotations: (v: boolean) => void
  annotationTool: AnnotationTool
  setAnnotationTool: (v: AnnotationTool) => void
  annotationColor: AnnotationColor
  setAnnotationColor: (v: AnnotationColor) => void
  textAnnotation: string
  setTextAnnotation: (v: string) => void
  onTextAnnotationSubmit: () => void
  onDeleteAnnotation: (id: string) => void
  td: (fr: string, en: string) => string
}

export function AnnotationPanel({
  videoRef,
  annotations,
  visibleAnnotationIds,
  showAnnotationTools,
  setShowAnnotationTools,
  showAnnotations,
  setShowAnnotations,
  annotationTool,
  setAnnotationTool,
  annotationColor,
  setAnnotationColor,
  textAnnotation,
  setTextAnnotation,
  onTextAnnotationSubmit,
  onDeleteAnnotation,
  td,
}: AnnotationPanelProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={showAnnotationTools}
            onCheckedChange={setShowAnnotationTools}
            id="ann-toggle"
          />
          <Label htmlFor="ann-toggle" className="text-sm">
            Mode dessin
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={showAnnotations}
            onCheckedChange={setShowAnnotations}
            id="ann-show"
          />
          <Label htmlFor="ann-show" className="text-sm">
            <Eye className="h-3.5 w-3.5 inline mr-1" />
            Afficher
          </Label>
        </div>
      </div>

      {/* Annotation tools */}
      <AnimatePresence>
        {showAnnotationTools && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardContent className="p-3 space-y-3">
                {/* Tool selection */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {([
                    { tool: 'freehand' as const, icon: PenTool, label: td('Dessin', 'Drawing') },
                    { tool: 'line' as const, icon: Minus, label: td('Ligne', 'Line') },
                    { tool: 'arrow' as const, icon: ChevronRight, label: td('Flèche', 'Arrow') },
                    { tool: 'circle' as const, icon: CircleDot, label: td('Cercle', 'Circle') },
                    { tool: 'text' as const, icon: Type, label: td('Texte', 'Text') },
                  ]).map(({ tool, icon: Icon, label }) => (
                    <Button
                      key={tool}
                      size="sm"
                      variant={annotationTool === tool ? 'default' : 'outline'}
                      className="h-8 px-2.5 text-xs shrink-0 gap-1"
                      onClick={() => setAnnotationTool(tool)}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />} {label}
                    </Button>
                  ))}
                </div>

                {/* Color picker */}
                <div className="flex items-center gap-1.5">
                  {ANNOTATION_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAnnotationColor(color)}
                      className={cn(
                        'h-6 w-6 rounded-full border-2 transition-transform',
                        annotationColor === color
                          ? 'border-foreground scale-110'
                          : 'border-transparent'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Text annotation input */}
                {annotationTool === 'text' && (
                  <div className="flex gap-2">
                    <Input
                      value={textAnnotation}
                      onChange={(e) => setTextAnnotation(e.target.value)}
                      placeholder={td("Texte de l'annotation...", 'Annotation text...')}
                      onKeyDown={(e) => e.key === 'Enter' && onTextAnnotationSubmit()}
                      className="h-9 text-sm"
                    />
                    <Button size="sm" onClick={onTextAnnotationSubmit} disabled={!textAnnotation.trim()}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Annotation list */}
      <ScrollArea className="max-h-52">
        <div className="space-y-2 pr-2">
          {annotations.length === 0 ? (
            <div className="text-center py-6">
              <PenTool className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{td('Aucune annotation', 'No annotations')}</p>
              <p className="text-xs text-muted-foreground mt-1">{td('Activez le mode dessin pour annoter', 'Enable drawing mode to annotate')}</p>
            </div>
          ) : (
            annotations.map((ann) => (
              <Card
                key={ann.id}
                className={cn(
                  'cursor-pointer transition-colors',
                  visibleAnnotationIds.includes(ann.id)
                    ? 'ring-2 ring-orange-500' :'hover:bg-muted/50'
                )}
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = ann.timestampMs / 1000
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{ann.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeMs(ann.timestampMs)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteAnnotation(ann.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  )
}