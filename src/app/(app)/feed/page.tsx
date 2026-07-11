import dynamic from 'next/dynamic'
const Screen = dynamic(() => import('@/components/screens/feed-screen'), { ssr: false })
export default function Page() { return <Screen /> }