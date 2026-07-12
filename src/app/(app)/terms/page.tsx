'use client'
import dynamic from 'next/dynamic'
const TermsScreen = dynamic(() => import('@/components/screens/terms-screen'), { ssr: false })
export default function Page() { return <TermsScreen /> }