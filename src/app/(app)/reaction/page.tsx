import dynamic from 'next/dynamic';
const Screen = dynamic(() => import('@/components/screens/reaction-trainer-screen'), { ssr: false })
export default function Page() { return <Screen /> }