"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Home, Dumbbell, Brain, Zap, Settings, Flame } from "lucide-react";
import { usePlayerStats } from "@/hooks/use-player-data";
import { useI18n } from "@/lib/i18n/language-provider";

export type TabId = "home" | "train" | "coach" | "profile" | "more";

interface AppShellProps {
  children: ReactNode;
  activeTab?: TabId;
  onNavigate?: (tabId: TabId) => void;
}

const tabs: { id: TabId; labelKey: string; Icon: typeof Home }[] = [
  { id: "home", labelKey: "tab.home", Icon: Home },
  { id: "train", labelKey: "tab.train", Icon: Dumbbell },
  { id: "coach", labelKey: "tab.coach", Icon: Brain },
  { id: "profile", labelKey: "tab.profile", Icon: Zap },
  { id: "more", labelKey: "tab.more", Icon: Settings },
];

export function AppShell({ children, activeTab = "home", onNavigate }: AppShellProps) {
  const { data: stats } = usePlayerStats();
  const { t, lang } = useI18n();

  const level = stats?.level?.level ?? 1;
  const titleText = stats?.level?.title?.[lang as "fr" | "en"] ?? "Rookie";
  const streak = stats?.streak ?? 0;
  const streakHot = streak >= 3;

  return (
    <div className="flex min-h-dvh flex-col bg-cv-bg">
      {/* ── Top accent line — thin lime gradient (non-interactive) ── */}
      <div className="fixed top-0 inset-x-0 z-50 h-[2px] bg-gradient-to-r from-transparent via-cv-lime/60 to-transparent pointer-events-none" aria-hidden="true" />

      {/* ── Top header bar ── */}
      <header
        className={`sticky top-0 z-40 flex h-14 items-center justify-between border-b border-cv-border bg-cv-bg/80 px-4 backdrop-blur-md ${
          streakHot ? "border-l-2 border-l-cv-lime" : ""
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-cv-text shrink-0">
            CourtVision
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-cv-text-secondary truncate">
            <span className="text-cv-lime">Lvl {level}</span>
            <span>·</span>
            <span>{titleText}</span>
          </span>
        </div>

        {/* Streak counter */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors ${
            streakHot
              ? "bg-cv-lime/10 ring-1 ring-cv-lime/20"
              : "bg-cv-subtle-hover"
          }`}
        >
          <Flame className={`w-4 h-4 ${streakHot ? "text-cv-warning" : "text-cv-text-muted"}`} />
          <span className={`font-bold tabular-nums ${streakHot ? "text-cv-lime" : "text-cv-text-secondary"}`}>
            {streak}
          </span>
        </div>
      </header>

      {/* ── Main content area ── */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* ── Bottom tab navigation ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cv-border-hover bg-cv-bg/90 backdrop-blur-xl">
        <ul className="flex h-16 items-center justify-around px-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <li key={tab.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => onNavigate?.(tab.id)}
                  className={`group relative flex w-full flex-col items-center gap-0.5 py-1 transition-all duration-200 ${
                    isActive
                      ? "text-cv-lime"
                      : "text-cv-text-muted hover:text-cv-text-secondary active:text-cv-text"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* Active tab indicator — sliding dot above icon */}
                  {isActive && (
                    <motion.span
                      layoutId="active-tab-indicator"
                      className="absolute -top-px left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-cv-lime"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      aria-hidden="true"
                    />
                  )}
                  {/* Icon with optional badge */}
                  <span className="relative">
                    <tab.Icon
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isActive ? "scale-110" : "group-hover:scale-105"
                      }`}
                      aria-hidden="true"
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    {/* Badge dot — coach tab AI online */}
                    {tab.id === "coach" && (
                      <span
                        className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-cv-lime border border-cv-bg animate-pulse"
                        aria-label="Online"
                      />
                    )}
                    {/* Badge dot — home tab streak active */}
                    {tab.id === "home" && streakHot && (
                      <span
                        className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-amber-500 border border-cv-bg"
                        aria-label="Streak active"
                      />
                    )}
                  </span>
                  <span
                    className={`transition-all duration-200 ${
                      isActive
                        ? "text-[11px] font-semibold"
                        : "text-[10px] font-medium"
                    }`}
                  >
                    {t(tab.labelKey)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}