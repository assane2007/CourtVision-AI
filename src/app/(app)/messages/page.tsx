import dynamic from 'next/dynamic'
const Screen = dynamic(() => import('@/components/screens/messages-screen'), { ssr: false })
export default function Page() { return <Screen /> }