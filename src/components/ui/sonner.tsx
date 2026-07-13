"use client";
import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

// ─── Custom toast icons ────────────────────────────────────────────────────────

function ToastIcon({ type }: { type: string }) {
  switch (type) {
    case 'success':
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-sm">
          ✅
        </span>
      )
    case 'error':
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-sm">
          ❌
        </span>
      )
    case 'warning':
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-sm">
          ⚠️
        </span>
      )
    case 'info':
    default:
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/15 text-sm">
          ℹ️
        </span>
      )
  }
}

function BasketballToaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "oklch(0.95 0.02 145)",
          "--success-text": "oklch(0.3 0.1 145)",
          "--success-border": "oklch(0.85 0.08 145)",
          "--error-bg": "oklch(0.97 0.01 25)",
          "--error-text": "oklch(0.4 0.12 25)",
          "--error-border": "oklch(0.9 0.06 25)",
          "--warning-bg": "oklch(0.97 0.02 80)",
          "--warning-text": "oklch(0.35 0.1 75)",
          "--warning-border": "oklch(0.9 0.06 80)",
          "--info-bg": "oklch(0.97 0.015 45)",
          "--info-text": "oklch(0.35 0.1 45)",
          "--info-border": "oklch(0.9 0.06 45)",
        } as React.CSSProperties
      }
      icons={{
        success: <ToastIcon type="success" />,
        error: <ToastIcon type="error" />,
        warning: <ToastIcon type="warning" />,
        info: <ToastIcon type="info" />,
      }}
      toastOptions={{
        classNames: {
          toast: 'group-[.toaster]:border-border/60 group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl',
          title: 'text-sm font-semibold',
          description: 'text-xs text-muted-foreground',
          actionButton: 'bg-orange-500 text-white hover:bg-orange-600 rounded-lg',
          cancelButton: 'bg-muted text-foreground hover:bg-muted/80 rounded-lg',
        },
        unstyled: false,
      }}
      {...props}
    />
  )
}

export { BasketballToaster as Toaster }