'use client';
import dynamic from'next/dynamic';
const AiWorkoutGenScreen = dynamic(() => import('@/components/screens/ai-workout-gen-screen'), { ssr: false })
export default function Page() { return <AiWorkoutGenScreen /> }