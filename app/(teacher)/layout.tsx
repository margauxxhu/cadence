import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/families', label: 'Families' },
  { href: '/assignments', label: 'Your Schedule' },
  { href: '/availability', label: 'Availability' },
  { href: '/blackouts', label: 'Blackouts' },
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-6 h-14">
          <span className="font-semibold text-blue-600">Cadence</span>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-auto">
            <form action="/api/auth/signout" method="post">
              <button className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
