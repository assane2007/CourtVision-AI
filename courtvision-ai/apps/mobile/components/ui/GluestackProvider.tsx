/**
 * GluestackProvider — Root provider for gluestack-ui themed components.
 * Wraps children with GluestackUIProvider and applies CourtVision dark theme.
 */

import React from 'react'
import { GluestackUIProvider } from '@gluestack-ui/themed'
import { courtVisionGluestackConfig } from '../../lib/gluestack-theme'

interface Props {
  children: React.ReactNode
}

export function GluestackProvider({ children }: Props) {
  return (
    <GluestackUIProvider config={courtVisionGluestackConfig} colorMode="dark">
      {children}
    </GluestackUIProvider>
  )
}
