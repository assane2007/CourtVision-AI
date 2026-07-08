"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { Circle } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

function ErrorFallback() {
  const { td } = useTranslation();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-cv-bg px-6">
      <div className="w-full max-w-sm rounded-xl border border-cv-border bg-cv-surface p-8 text-center shadow-lg shadow-black/20">
        {/* Basketball icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cv-lime/10">
          <Circle className="h-8 w-8 text-cv-lime" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h2 className="mb-1.5 text-lg font-semibold text-cv-text">
          {td("Une erreur est survenue", "An error occurred")}
        </h2>

        {/* Message */}
        <p className="mb-6 text-sm leading-relaxed text-cv-text-muted">
          {td("Quelque chose s'est mal passé. Veuillez réessayer.", "Something went wrong. Please try again.")}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-cv-lime px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#bef264] transition-colors"
          >
            {td("Recharger la page", "Reload page")}
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = "/"; }}
            className="rounded-lg bg-cv-subtle-hover px-5 py-2.5 text-sm font-medium text-cv-text hover:bg-white/[0.1] transition-colors"
          >
            {td("Retour à l'accueil", "Go home")}
          </button>
        </div>

        {/* Reported note */}
        <p className="mt-5 text-xs text-cv-text-muted/70">
          {td("L'erreur a été signalée.", "Error reported.")}
        </p>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in development; in production you'd send to a monitoring service
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback />;
    }

    return this.props.children;
  }
}