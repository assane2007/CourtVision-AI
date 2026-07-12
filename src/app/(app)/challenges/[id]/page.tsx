import dynamic from 'next/dynamic';
const Screen = dynamic(() => import('@/components/screens/challenge-detail-screen'), { ssr: false })
export default function Page() { return <Screen /> }