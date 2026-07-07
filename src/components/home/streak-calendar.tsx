'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/components/providers/language-provider'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DailyStat {
  date: string
  sessions: number
}

interface StreakCalendarProps {
  dailyStats: DailyStat[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

function getColor(sessions: number) {
  if (sessions === 0) return 'bg-muted/60 dark:bg-muted/30'
  if (sessions === 1) return 'bg-orange-200 dark:bg-orange-800/60'
  if (sessions <= 2) return 'bg-orange-400 dark:bg-orange-600/70'
  return 'bg-orange-600 dark:bg-orange-500'
}

function getCellBorderColor(dateStr: string, isToday: boolean) {
  if (!isToday) return 'ring-0'
  return 'ring-2 ring-orange-500 ring-offset-1 ring-offset-background dark:ring-offset-card'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function StreakCalendar({ dailyStats }: StreakCalendarProps) {
  const { language } = useTranslation()
  const todayDate = new Date()
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`

  // Build a 4-week grid (28 days, 7 rows × 4 columns)
  const grid = useMemo(() => {
    const statsMap = new Map(dailyStats.map((d) => [d.date, d.sessions]))

    // We want last 28 days, arranged as 7 rows (Mon-Sun) × 4 columns (weeks)
    const today = new Date()
    const todayDow = today.getDay() // 0=Sun
    // Convert to Mon=0 ... Sun=6
    const mondayOffset = todayDow === 0 ? 6 : todayDow - 1

    // Start from the Monday of the current week, go back 3 more weeks
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - mondayOffset - 21)

    const rows: { date: string; sessions: number; dayNum: number; isToday: boolean }[][] = []
    let currentRow: typeof rows[0] = []

    for (let i = 0; i < 28; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      currentRow.push({
        date: dateStr,
        sessions: statsMap.get(dateStr) ?? 0,
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
      })
      if (currentRow.length === 7) {
        rows.push(currentRow)
        currentRow = []
      }
    }

    return rows
  }, [dailyStats, todayStr])

  const totalActiveDays = dailyStats.filter((d) => d.sessions > 0).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.15 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15">
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <CardTitle className="text-sm font-semibold">Calendrier d&apos;Activit&eacute;</CardTitle>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {totalActiveDays} jour{totalActiveDays !== 1 ? 's' : ''} actif{totalActiveDays !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {/* Column headers (week labels) */}
          <div className="mb-1.5 flex gap-1.5 pl-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[10px] font-medium text-muted-foreground/60">
                  {i === 3 ? 'Auj.' : `S${i + 1}`}
                </span>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="space-y-1.5">
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-1.5">
                {/* Day label */}
                <div className="w-5 text-center">
                  <span className="text-[10px] font-medium text-muted-foreground/60 leading-none">
                    {DAY_LABELS[rowIdx]}
                  </span>
                </div>
                {/* Cells */}
                {row.map((cell) => (
                  <div
                    key={cell.date}
                    className="flex-1 flex items-center justify-center"
                    title={`${cell.date} — ${cell.sessions} séance${cell.sessions > 1 ? 's' : ''}`}
                    aria-label={`${new Date(cell.date + 'T00:00:00').toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long' })}: ${cell.sessions} séance${cell.sessions > 1 ? 's' : ''}`}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                        delay: 0.02 * (rowIdx * 7 + row.indexOf(cell)),
                      }}
                      className={cn(
                        'aspect-square w-full max-w-[32px] rounded-[4px] transition-colors',
                        getColor(cell.sessions),
                        getCellBorderColor(cell.date, cell.isToday),
                      )}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-1.5">
            <span className="text-[10px] text-muted-foreground/60">Moins</span>
            {[
              'bg-muted/60 dark:bg-muted/30',
              'bg-orange-200 dark:bg-orange-800/60',
              'bg-orange-400 dark:bg-orange-600/70',
              'bg-orange-600 dark:bg-orange-500',
            ].map((color, i) => (
              <div key={i} className={cn('h-[10px] w-[10px] rounded-[2px]', color)} />
            ))}
            <span className="text-[10px] text-muted-foreground/60">Plus</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

