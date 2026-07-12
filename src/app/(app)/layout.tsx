import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Check auth server-side
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/')
  } catch {
    redirect('/')
  }

  return (
    <main className="min-h-screen bg-background">
      {children}
    </main>
  )
}