'use client'
import dynamic from 'next/dynamic'
const HomeScreen = dynamic(() => import('@/components/screens/home-screen'), { ssr: false })
export default function Page() { return <HomeScreen /> }