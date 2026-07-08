"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

interface ScreenErrorBoundaryProps {
  children: ReactNode;
  screenName: string;
  onRetry?: () => void;
}

interface ScreenErrorBoundaryState {
  hasError: boolean;
}

function ScreenErrorFallback({
  screenName,
  onRetry,
}: {
  screenName: string;
  onRetry?: () => void;
}) {
  const { td } = useTranslation();

  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-full max-w-xs rounded-xl border border-cv-border bg-cv-surface p-6 text-center shadow-lg shadow-black/20">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cv-lime/10">
          <AlertTriangle className="h-6 w-6 text-cv-lime" />
        </div>

        <h3 className="mb-1 text-sm font-semibold text-cv-text">
          {screenName}
        </h3>

        <p className="mb-5 text-xs leading-relaxed text-cv-text-secondary">
          {td("Une erreur est survenue", "An error occurred")}
        </p>

        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-cv-lime px-5 py-2 text-sm font-semibold text-black hover:bg-[#bef264] transition-colors"
        >
          {td("Réessayer", "Retry")}
        </button>
      </div>
    </div>
  );
}

export class ScreenErrorBoundary extends Component<
  ScreenErrorBoundaryProps,
  ScreenErrorBoundaryState
> {
  constructor(props: ScreenErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ScreenErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ScreenErrorBoundary:${this.props.screenName}]`,
      error,
      info.componentStack
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ScreenErrorFallback
          screenName={this.props.screenName}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}