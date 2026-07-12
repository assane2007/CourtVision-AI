import dynamic from 'next/dynamic';
const Screen = dynamic(() => import('@/components/screens/live-workout-screen'), { ssr: false })
export default function Page() { return <Screen /> }