'use client';
import dynamic from'next/dynamic';
const TrainHubScreen = dynamic(() => import('@/components/screens/train-hub-screen'), { ssr: false })
export default function Page() { return <TrainHubScreen /> }