'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  ArrowLeft, User, Palette, Bell, Dumbbell,
  Database, FlaskConical, AlertTriangle, Loader2,
  Camera, Sun, Moon, Monitor, Volume2, RefreshCw,
  Download, Trash2, Pencil, Lock, Eye, Trophy, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useAppStore } from '@/stores/app'
import { SwipeToGoBack } from '@/components/shared/swipe-back'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useAuth } from '@/components/providers/supabase-auth-provider'
import { useTranslation } from '@/components/providers/language-provider'
import { apiFetch } from '@/lib/utils'
import { containerVariants, itemVariants } from '@/lib/animations'
import { DeveloperSection } from '@/components/settings/developer-section'
import { SettingsSkeleton } from '@/components/settings/settings-skeleton'

// ── Types ──────────────────────────────────────────────────────────────────

interface UserSettings {
  weeklyGoalSessions: number
  weeklyGoalReps: number
  preferredRestSec: number
  soundEnabled: boolean
  hapticsEnabled: boolean
  language: 'fr' | 'en'
  notifStreak: boolean
  notifChallenge: boolean
  notifAchievement: boolean
  notifEmail: boolean
  notifSocial: boolean
  notifPush: boolean
  profilePublic: boolean
  showOnLeaderboard: boolean
  showActivity: boolean
  defaultTrainingDuration: number
  autoPauseBetweenDrills: boolean
  voiceCoachingVolume: number
  cameraPreference: 'front' | 'back'
  profileVisibility: 'public' | 'friends' | 'private'
  [key: string]: unknown
}

const DEFAULT_SETTINGS: UserSettings = {
  weeklyGoalSessions: 3, weeklyGoalReps: 50, preferredRestSec: 15,
  soundEnabled: true, hapticsEnabled: true, language: 'fr',
  notifStreak: true, notifChallenge: true, notifAchievement: true,
  notifEmail: true, notifSocial: true, notifPush: false,
  profilePublic: true, showOnLeaderboard: true, showActivity: true,
  defaultTrainingDuration: 30, autoPauseBetweenDrills: false,
  voiceCoachingVolume: 70, cameraPreference: 'front',
  profileVisibility: 'public',
}

// ── Section Card Wrapper ──────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children, danger }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className={danger ? 'border-red-500/50' : undefined}>
        {title && (
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${danger ? 'bg-red-500/10' : 'bg-orange-500/10'}`}>
                <Icon className={`h-4 w-4 ${danger ? 'text-red-500' : 'text-orange-500'}`} />
              </div>
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="pt-0 space-y-4">{children}</CardContent>
      </Card>
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export function SettingsScreen() {
  const goBack = useAppStore((s) => s.goBack)
  const queryClient = useQueryClient()
  const { t, td, setLanguage: setI18nLanguage } = useTranslation()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  // Fetch settings
  const { data: settingsData, isLoading, isError, refetch } = useQuery<{ settings: UserSettings }>({
    queryKey: ['settings'], queryFn: () => apiFetch('/api/settings'), staleTime: 60_000,
  })
  const settings = { ...DEFAULT_SETTINGS, ...settingsData?.settings }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (patch: Partial<UserSettings>) =>
      apiFetch<{ settings: UserSettings }>('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => { toast.success(t('settings.saved')); queryClient.invalidateQueries({ queryKey: ['settings'] }) },
    onError: (err) => toast.error(err.message || t('settings.saveError')),
  })

  const patch = useCallback((data: Partial<UserSettings>) => saveMutation.mutate(data), [saveMutation])

  // Language change handler
  const handleLanguageChange = (val: string) => {
    if (val !== settings.language) { patch({ language: val as 'fr' | 'en' }); setI18nLanguage(val as 'fr' | 'en') }
  }

  // ── Account State ──
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteStep, setDeleteStep] = useState(0)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwNew !== pwConfirm) { toast.error(td('Les mots de passe ne correspondent pas', 'Passwords do not match')); return }
    if (pwNew.length < 8) { toast.error(td('Min. 8 caractères', 'Min. 8 characters')); return }
    setPwLoading(true)
    try {
      const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }) })
      if (res.ok) { toast.success(t('settings.passwordUpdated')); setShowPasswordDialog(false); setPwCurrent(''); setPwNew(''); setPwConfirm('') }
      else { const d = await res.json(); toast.error(d.error || t('settings.passwordError')) }
    } catch { toast.error(t('settings.passwordError')) }
    finally { setPwLoading(false) }
  }

  const handleDeleteAccount = async () => {
    if (deleteStep === 0) { setDeleteStep(1); return }
    if (deleteTyped !== 'SUPPRIMER') { toast.error(td('Tapez SUPPRIMER pour confirmer', 'Type SUPPRIMER to confirm')); return }
    try {
      await apiFetch('/api/player/delete', { method: 'DELETE' })
      toast.success(t('settings.deleteAccountSuccess'))
      window.location.href = '/api/auth/signout'
    } catch (err) { toast.error(err instanceof Error ? err.message : t('settings.deleteAccountError')); setDeleteStep(0); setDeleteTyped('') }
  }

  // ── Danger Zone State ──
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetStep, setResetStep] = useState(0)
  const [resetLoading, setResetLoading] = useState(false)

  const handleResetProgress = async () => {
    if (resetStep === 0) { setResetStep(1); return }
    setResetLoading(true)
    try {
      await apiFetch('/api/player/progress', { method: 'DELETE' })
      toast.success(td('Progression réinitialisée', 'Progress reset'))
      setShowResetDialog(false); setResetStep(0)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    } catch { toast.error(t('settings.saveError')); setResetStep(0) }
    finally { setResetLoading(false) }
  }

  // ── Data & Storage ──
  const [exportLoading, setExportLoading] = useState(false)
  const [cacheSize, setCacheSize] = useState('2.4 MB')

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await fetch('/api/player/export?format=json')
      if (!res.ok) throw new Error(t('settings.exportError'))
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = 'courtvision-export.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url); toast.success(t('settings.exportSuccess'))
    } catch (err) { toast.error(err instanceof Error ? err.message : t('settings.exportError')) }
    finally { setExportLoading(false) }
  }

  const handleClearCache = async () => {
    if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); setCacheSize('0 B') }
    localStorage.clear(); sessionStorage.clear()
    toast.success(td('Cache effacé', 'Cache cleared'))
  }

  // ── Push Notification ──
  const handlePushToggle = async (checked: boolean) => {
    if (checked) {
      try {
        if ('Notification' in window && Notification.permission === 'default') { await Notification.requestPermission() }
        const reg = await navigator.serviceWorker?.getRegistration()
        if (!reg?.pushManager) { toast.error(td('Push non supporté', 'Push not supported')); return }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: '' })
        await apiFetch('/api/notifications/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) })
        patch({ notifPush: true })
      } catch { toast.error(td('Erreur activation push', 'Error enabling push')) }
    } else {
      patch({ notifPush: false })
    }
  }

  const SavingSpinner = saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-auto shrink-0 text-orange-500" /> : null

  return (
    <SwipeToGoBack className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label={td('Retour', 'Back')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">{t('screen.settings')}</h1>
        </div>
      </header>

      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 pt-4 pb-24">
        {isError && !isLoading ? (
          <div className="flex items-center justify-between rounded-xl border border-destructive/50 bg-destructive/5 px-4 py-3 mb-4">
            <p className="text-sm text-destructive">{t('settings.loadError')}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />{t('action.retry')}</Button>
          </div>
        ) : null}

        {isLoading ? <SettingsSkeleton /> : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

            {/* ── a) Account Section ── */}
            <SectionCard icon={User} title={td('Compte', 'Account')}>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {user?.avatar && <AvatarImage src={user.avatar} alt={user.name || ''} />}
                  <AvatarFallback className="text-lg font-bold bg-orange-500/10 text-orange-600">
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user?.name || '—'}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span className="truncate">{user?.email || '—'}</span>
                    <Pencil className="h-3 w-3 shrink-0 opacity-40" />
                  </div>
                </div>
              </div>
              <Separator />
              <Button variant="outline" className="w-full justify-start min-h-[44px]" onClick={() => setShowPasswordDialog(true)}>
                <Lock className="h-4 w-4 mr-3 text-muted-foreground" />
                <span className="text-sm font-medium">{td('Changer le mot de passe', 'Change password')}</span>
              </Button>
              <Button variant="outline" className="w-full justify-start min-h-[44px] text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => { setShowDeleteDialog(true); setDeleteStep(0); setDeleteTyped('') }}>
                <Trash2 className="h-4 w-4 mr-3" />
                <span className="text-sm font-medium">{t('settings.deleteAccountButton')}</span>
              </Button>
            </SectionCard>

            {/* ── b) Appearance Section ── */}
            <SectionCard icon={Palette} title={td('Apparence', 'Appearance')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="h-4 w-4 text-muted-foreground" /> : theme === 'light' ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
                  <Label className="text-sm font-medium">{td('Thème', 'Theme')}</Label>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light"><Sun className="h-3 w-3 inline mr-2" />{td('Clair', 'Light')}</SelectItem>
                    <SelectItem value="dark"><Moon className="h-3 w-3 inline mr-2" />{td('Sombre', 'Dark')}</SelectItem>
                    <SelectItem value="system"><Monitor className="h-3 w-3 inline mr-2" />{td('Système', 'System')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 text-sm leading-4 text-muted-foreground">🌐</span>
                  <Label htmlFor="language-select" className="text-sm font-medium">{t('settings.language')}</Label>
                </div>
                <Select value={settings.language} onValueChange={handleLanguageChange} disabled={saveMutation.isPending}>
                  <SelectTrigger id="language-select" className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">{td('Français', 'French')}</SelectItem>
                    <SelectItem value="en">{td('Anglais', 'English')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SectionCard>

            {/* ── c) Notifications Section ── */}
            <SectionCard icon={Bell} title={t('settings.notifications')}>
              {([
                { key: 'notifPush' as const, label: td('Notifications push', 'Push notifications'), desc: t('settings.pushDesc'), icon: Bell, handler: handlePushToggle },
                { key: 'notifEmail' as const, label: td('Notifications email', 'Email notifications'), desc: td('Recevoir par email', 'Receive via email'), icon: () => <span className="h-4 w-4 text-muted-foreground">✉️</span>, handler: null },
                { key: 'notifStreak' as const, label: t('settings.streakReminders'), desc: td('Rappels d\'entraînement', 'Training reminders'), icon: Bell, handler: null },
                { key: 'notifSocial' as const, label: t('settings.notifSocial'), desc: td('Activité des amis', 'Friend activity'), icon: () => <span className="h-4 w-4 text-muted-foreground">👥</span>, handler: null },
              ] as const).map((item, i) => (
                <div key={item.key}>
                  {i > 0 && <Separator className="my-4" />}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">{item.label}</Label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <Switch id={item.key} checked={settings[item.key] as boolean} onCheckedChange={item.handler || ((c: boolean) => patch({ [item.key]: c }))}
                      disabled={saveMutation.isPending} className="data-[state=checked]:bg-orange-500 shrink-0" />
                  </div>
                </div>
              ))}
              {SavingSpinner}
            </SectionCard>

            {/* ── d) Privacy Section ── */}
            <SectionCard icon={Eye} title={td('Confidentialité', 'Privacy')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">{t('settings.publicProfile')}</Label>
                </div>
                <Select value={(settings.profileVisibility as string) || 'public'} onValueChange={(v) => patch({ profileVisibility: v })} disabled={saveMutation.isPending}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{td('Public', 'Public')}</SelectItem>
                    <SelectItem value="friends">{td('Amis', 'Friends')}</SelectItem>
                    <SelectItem value="private">{td('Privé', 'Private')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              {([
                { key: 'showOnLeaderboard' as const, label: t('settings.showLeaderboard'), icon: Trophy },
                { key: 'showActivity' as const, label: t('settings.showActivity'), icon: Eye },
              ]).map((item, i) => (
                <div key={item.key}>
                  {i > 0 && <Separator className="my-4" />}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">{item.label}</Label>
                    </div>
                    <Switch id={item.key} checked={settings[item.key] as boolean} onCheckedChange={(c: boolean) => patch({ [item.key]: c })}
                      disabled={saveMutation.isPending} className="data-[state=checked]:bg-orange-500" />
                  </div>
                </div>
              ))}
              {SavingSpinner}
            </SectionCard>

            {/* ── e) Training Section ── */}
            <SectionCard icon={Dumbbell} title={t('settings.training')}>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{td('Durée d\'entraînement par défaut', 'Default training duration')}</Label>
                <Select value={String(settings.defaultTrainingDuration || 30)} onValueChange={(v) => patch({ defaultTrainingDuration: parseInt(v) })} disabled={saveMutation.isPending}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60].map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <div><Label className="text-sm font-medium">{td('Pause auto entre les exercices', 'Auto-pause between drills')}</Label></div>
                </div>
                <Switch id="auto-pause" checked={settings.autoPauseBetweenDrills as boolean}
                  onCheckedChange={(c: boolean) => patch({ autoPauseBetweenDrills: c })} disabled={saveMutation.isPending}
                  className="data-[state=checked]:bg-orange-500" />
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">{td('Volume du coaching vocal', 'Voice coaching volume')}</Label>
                  </div>
                  <span className="text-sm font-bold text-orange-500 tabular-nums">{settings.voiceCoachingVolume || 70}%</span>
                </div>
                <Slider value={[settings.voiceCoachingVolume || 70]} onValueChange={([v]) => patch({ voiceCoachingVolume: v })}
                  min={0} max={100} step={5} disabled={saveMutation.isPending}
                  className="[&_[data-slot=slider-range]]:bg-orange-500 [&_[data-slot=slider-thumb]]:border-orange-500" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">{td('Préférence caméra', 'Camera preference')}</Label>
                </div>
                <Select value={(settings.cameraPreference as string) || 'front'} onValueChange={(v) => patch({ cameraPreference: v })} disabled={saveMutation.isPending}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="front">{td('Avant', 'Front')}</SelectItem>
                    <SelectItem value="back">{td('Arrière', 'Back')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {SavingSpinner}
            </SectionCard>

            {/* ── f) Data & Storage Section ── */}
            <SectionCard icon={Database} title={td('Données & Stockage', 'Data & Storage')}>
              <Button variant="ghost" className="w-full justify-start h-auto py-3 px-3 min-h-[44px]" onClick={handleExport} disabled={exportLoading}>
                <Download className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-medium">{t('settings.exportData')}</div>
                  <div className="text-xs text-muted-foreground">{t('settings.exportDataDesc')}</div>
                </div>
                {exportLoading && <Loader2 className="h-4 w-4 animate-spin ml-auto shrink-0" />}
              </Button>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{td('Taille du cache', 'Cache size')}</p>
                  <p className="text-xs text-muted-foreground">{cacheSize}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearCache}>
                  <Trash2 className="h-4 w-4 mr-2" />{td('Effacer le cache', 'Clear cache')}
                </Button>
              </div>
            </SectionCard>

            {/* ── g) Developer Section ── */}
            <SectionCard icon={FlaskConical} title={t('settings.experimentalFeatures')}>
              <DeveloperSection />
            </SectionCard>

            {/* ── h) Danger Zone ── */}
            <SectionCard icon={AlertTriangle} title={td('Zone de danger', 'Danger Zone')} danger>
              <Button variant="outline" className="w-full justify-start min-h-[44px] text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                onClick={() => { setShowResetDialog(true); setResetStep(0) }}>
                <RefreshCw className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium">{td('Réinitialiser ma progression', 'Reset my progress')}</div>
                  <div className="text-xs text-muted-foreground">{td('Toutes vos statistiques seront remises à zéro', 'All your stats will be reset to zero')}</div>
                </div>
              </Button>
              <Separator />
              <Button variant="outline" className="w-full justify-start min-h-[44px] text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                onClick={() => { setShowDeleteDialog(true); setDeleteStep(0); setDeleteTyped('') }}>
                <Trash2 className="h-4 w-4 mr-3" />
                <div className="text-left">
                  <div className="text-sm font-medium">{t('settings.deleteAccountButton')}</div>
                  <div className="text-xs text-muted-foreground">{t('settings.deleteConfirm1')}</div>
                </div>
              </Button>
            </SectionCard>

            {/* ── Info ── */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span className="font-medium">CourtVision AI</span>
                    <span className="text-xs">v0.2.0</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{t('settings.developedWith')}</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </main>

      <BottomNav />

      {/* ── Password Dialog ── */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{td('Changer le mot de passe', 'Change password')}</DialogTitle>
            <DialogDescription>{td('Entrez votre mot de passe actuel et choisissez un nouveau', 'Enter current and new password')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw-current">{t('settings.currentPassword')}</Label>
              <Input id="pw-current" type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-new">{t('settings.newPassword')}</Label>
              <Input id="pw-new" type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder={td('Min. 8 caractères', 'Min. 8 characters')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-confirm">{t('settings.confirmNewPassword')}</Label>
              <Input id="pw-confirm" type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPasswordDialog(false)}>{t('action.cancel')}</Button>
              <Button type="submit" disabled={pwLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
                {pwLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{t('action.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Dialog ── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">{t('settings.deleteAccountButton')}</DialogTitle>
            <DialogDescription>{t('settings.deleteConfirm1')}</DialogDescription>
          </DialogHeader>
          {deleteStep === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{td('Toutes vos données seront définitivement supprimées.', 'All your data will be permanently deleted.')}</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>{t('action.cancel')}</Button>
                <Button variant="destructive" onClick={() => setDeleteStep(1)}>{t('action.next')}</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{td('Tapez SUPPRIMER pour confirmer la suppression définitive de votre compte.', 'Type SUPPRIMER to confirm permanent account deletion.')}</p>
              <Input value={deleteTyped} onChange={(e) => setDeleteTyped(e.target.value)} placeholder="SUPPRIMER" className="font-mono" />
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDeleteStep(0); setDeleteTyped('') }}>{t('action.cancel')}</Button>
                <Button variant="destructive" disabled={deleteTyped !== 'SUPPRIMER'} onClick={handleDeleteAccount}>
                  {t('settings.deleteFinalButton')}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reset Progress Dialog ── */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">{td('Réinitialiser la progression', 'Reset progress')}</DialogTitle>
            <DialogDescription>{td('Toutes vos statistiques seront remises à zéro.', 'All your stats will be reset to zero.')}</DialogDescription>
          </DialogHeader>
          {resetStep === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{td('Cette action est irréversible. Vos scores, séances et records seront effacés.', 'This action is irreversible. Scores, sessions and records will be erased.')}</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowResetDialog(false)}>{t('action.cancel')}</Button>
                <Button variant="destructive" onClick={() => setResetStep(1)}>{td('Continuer', 'Continue')}</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-red-500 font-medium">{td('Êtes-vous vraiment sûr ? Cliquez pour confirmer.', 'Are you really sure? Click to confirm.')}</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowResetDialog(false); setResetStep(0) }}>{t('action.cancel')}</Button>
                <Button variant="destructive" disabled={resetLoading} onClick={handleResetProgress}>
                  {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{td('Confirmer la réinitialisation', 'Confirm reset')}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SwipeToGoBack>
  )
}

export default SettingsScreen