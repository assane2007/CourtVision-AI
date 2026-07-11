import dynamic from 'next/dynamic'
const Screen = dynamic(() => import('@/components/screens/video-upload-screen'), { ssr: false })
export default function Page() { return <Screen /> }