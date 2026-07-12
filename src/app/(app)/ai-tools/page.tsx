import dynamic from 'next/dynamic'
const Screen = dynamic(() => import('@/components/screens/ai-tools-screen'), { ssr: false })
export default function Page() { return <Screen /> }