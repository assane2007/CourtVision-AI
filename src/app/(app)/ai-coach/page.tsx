import dynamic from 'next/dynamic';
const Screen = dynamic(() => import('@/components/screens/ai-coach-screen'), { ssr: false })
export default function Page() { return <Screen /> }