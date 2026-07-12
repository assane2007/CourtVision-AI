import dynamic from 'next/dynamic'
const Screen = dynamic(() => import('@/components/screens/camera-workout'), { ssr: false })
export default function Page() { return <Screen /> }