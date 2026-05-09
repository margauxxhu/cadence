import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/magic-link')

  return (
    <div className="min-h-screen">
      <nav className="bg-stone-900 border-b border-stone-800">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
          <span className="font-display text-white text-3xl font-semibold tracking-[0.10em]">
            Cadence
          </span>
          <form action="/api/auth/signout" method="post">
            <button className="text-sm text-stone-500 hover:text-stone-300 transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  )
}
