'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/stores/app';

export function useRouterNavigation() {
  const router = useRouter()
  const setRouter = useAppStore(s => s?.setRouter)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized?.current) {
      setRouter(router)
      initialized.current = true
    }
  }, [router, setRouter])
}