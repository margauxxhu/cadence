import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/families', label: 'Families' },
  { href: '/assignments', label: 'Your Schedule' },
  { href: '/availability', label: 'Availability' },
  { href: '/lessons', label: 'Lesson History' },
]

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('teacher_settings')
    .select('teacher_uid')
    .single()

  if (!settings?.teacher_uid || settings.teacher_uid !== user.id) {
    redirect('/my-lessons')
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-stone-900 border-b border-stone-800">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-8 h-14">
          <span className="font-display text-stone-100 text-xl font-light tracking-[0.18em] shrink-0">
            Cadence
          </span>
          <div className="flex items-center gap-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-stone-400 hover:text-stone-100 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto">
            <form action="/api/auth/signout" method="post">
              <button className="text-sm text-stone-500 hover:text-stone-300 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  )
}
