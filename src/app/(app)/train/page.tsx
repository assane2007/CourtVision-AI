import dynamic from 'next/dynamic';
const Screen = dynamic(() => import('@/components/screens/train-hub-screen'), { ssr: false })
export default function Page() { return <Screen /> }