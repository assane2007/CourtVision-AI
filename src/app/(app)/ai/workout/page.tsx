import dynamic from 'next/dynamic';
const Screen = dynamic(() => import('@/components/screens/ai-workout-gen-screen'), { ssr: false })
export default function Page() { return <Screen /> }