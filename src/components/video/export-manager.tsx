'use client';
import { Loader2, Download, FileOutput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn, formatLocaleDate } from '@/lib/utils';
import { formatTimeMs, formatFileSize } from '@/components/video/video-types';
import type { VideoExport } from '@/components/video/video-types';

interface ExportManagerProps {
  videoExports: VideoExport[]
  currentTime: number
  startExport: {
    isPending: boolean
    mutate: (data: { type: string; startMs: number; endMs: number; quality: string }) => void
  }
  exportDialogOpen: boolean
  setExportDialogOpen: (open: boolean) => void
  exportStart: number
  setExportStart: (v: number) => void
  exportEnd: number
  setExportEnd: (v: number) => void
  exportQuality: string
  setExportQuality: (v: string) => void
  exportType: string
  setExportType: (v: string) => void
  td: (fr: string, en: string) => string
}

export function ExportManager({
  videoExports,
  currentTime,
  startExport,
  exportDialogOpen,
  setExportDialogOpen,
  exportStart,
  setExportStart,
  exportEnd,
  setExportEnd,
  exportQuality,
  setExportQuality,
  exportType,
  setExportType,
  td,
}: ExportManagerProps) {
  return (
    <>
      <Button
        className="w-full gap-2"
        onClick={() => {
          setExportStart(Math.round(currentTime * 1000))
          setExportEnd(Math.round(currentTime * 1000) + 10000)
          setExportDialogOpen(true)
        }}
      >
        <FileOutput className="h-4 w-4" />
        Nouvel export
      </Button>

      <ScrollArea className="max-h-72">
        <div className="space-y-2 pr-2">
          {videoExports.length === 0 ? (
            <div className="text-center py-6">
              <Download className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{td('Aucun export', 'No exports')}</p>
            </div>
          ) : (
            videoExports.map((exp) => (
              <Card key={exp.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {exp.format}
                      </Badge>
                      <span className={cn(
                        'text-[10px] font-medium',
                        exp.status === 'completed' && 'text-green-500',
                        exp.status === 'failed' && 'text-destructive',
                        exp.status === 'processing' && 'text-orange-500',
                        exp.status === 'pending' && 'text-muted-foreground',
                      )}>
                        {exp.status === 'completed' ? td('Terminé', 'Completed') :
                         exp.status === 'processing' ? td('Traitement...', 'Processing...') :
                         exp.status === 'failed' ? td('Échoué', 'Failed') : td('En attente', 'Pending')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFileSize(exp.fileSize)} · {formatLocaleDate(new Date(exp.createdAt))}
                    </p>
                  </div>
                  {exp.status === 'completed' && exp.url && (
                    <a
                      href={exp.url}
                      download
                      className="shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {exp.status === 'processing' && (
                    <Loader2 className="h-4 w-4 animate-spin text-orange-500 shrink-0" />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{td('Exporter', 'Export')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{td('Format', 'Format')}</Label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gif">GIF</SelectItem>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="webm">WebM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{td('Qualité', 'Quality')}</Label>
                <Select value={exportQuality} onValueChange={setExportQuality}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{td('Basse', 'Low')}</SelectItem>
                    <SelectItem value="medium">{td('Moyenne', 'Medium')}</SelectItem>
                    <SelectItem value="high">{td('Haute', 'High')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{td('Début (ms)', 'Start (ms)')}</Label>
                <Input
                  type="number"
                  value={exportStart}
                  onChange={(e) => setExportStart(parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>{td('Fin (ms)', 'End (ms)')}</Label>
                <Input
                  type="number"
                  value={exportEnd}
                  onChange={(e) => setExportEnd(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {td('Durée:', 'Duration:')} {formatTimeMs(exportEnd - exportStart)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>{td('Annuler', 'Cancel')}</Button>
            <Button
              onClick={() => startExport.mutate({ type: exportType, startMs: exportStart, endMs: exportEnd, quality: exportQuality })}
              disabled={exportEnd <= exportStart || startExport.isPending}
            >
              {startExport.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {td('Exporter', 'Export')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}