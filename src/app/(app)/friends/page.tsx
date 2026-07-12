import dynamic from 'next/dynamic';
const Screen = dynamic(() => import('@/components/screens/friends-screen'), { ssr: false })
export default function Page() { return <Screen /> }