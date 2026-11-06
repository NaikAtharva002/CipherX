import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OrganiserSidebar from '@/components/organiser/OrganiserSidebar'

export default async function OrganiserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

  // Don't protect or wrap login/signup pages with the dashboard sidebar
  if (pathname.includes('/login') || pathname.includes('/signup')) {
    return <>{children}</>
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/organiser/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'organiser') {
    redirect('/organiser/login?error=access_denied')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <OrganiserSidebar
        userEmail={profile.email}
        userName={profile.full_name ?? 'Organiser'}
      />
      <main
        style={{
          flex: 1,
          marginLeft: '0',
          minHeight: '100vh',
          overflow: 'auto',
        }}
        className="organiser-main"
      >
        {children}
      </main>

      <style>{`
        @media (min-width: 1024px) {
          .organiser-main {
            margin-left: 260px;
          }
        }
      `}</style>
    </div>
  )
}
