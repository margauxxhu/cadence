import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/magic-link')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
          <span className="font-semibold text-blue-600">Cadence</span>
          <form action="/api/auth/signout" method="post">
            <button className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
          </form>
        </div>
      </nav>
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
