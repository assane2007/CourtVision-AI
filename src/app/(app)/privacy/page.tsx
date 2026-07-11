'use client'
import dynamic from 'next/dynamic'
const PrivacyScreen = dynamic(() => import('@/components/screens/privacy-screen'), { ssr: false })
export default function Page() { return <PrivacyScreen /> }