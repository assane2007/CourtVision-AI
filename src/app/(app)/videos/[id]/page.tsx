'use client';
import dynamic from 'next/dynamic';
const Screen = dynamic(() => import('@/components/screens/video-player-screen'), { ssr: false })
export default function Page() { return <Screen /> }