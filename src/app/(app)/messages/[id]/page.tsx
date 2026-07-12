'use client';
import dynamic from 'next/dynamic';
const Screen = dynamic(() => import('@/components/screens/conversation-screen'), { ssr: false })
export default function Page() { return <Screen /> }