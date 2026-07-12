import dynamic from 'next/dynamic'
const Screen = dynamic(() => import('@/components/screens/team-detail-screen'), { ssr: false })
export default function Page() { return <Screen /> }