import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Use getUser() — validates session with Supabase server (not just local cookie)
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) redirect('/')
  } catch {
    redirect('/')
  }

  return (
    <main className="min-h-screen bg-background">
      {children}
    </main>
  )
}