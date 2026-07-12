import dynamic from 'next/dynamic';
import { Screen } from '../../../../mobile/src/stores/app';

const Screen = dynamic(() => import('@/components/screens/user-dashboard-screen')?.then(m => ({ default: m?.UserDashboardScreen })), { ssr: false });
export default function Page() { return <Screen />; }
