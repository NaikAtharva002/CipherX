'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface TeamSession {
  teamId: string
  teamCode: string
  teamName: string
  expiresAt: number
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<TeamSession | null>(null)
  const [points, setPoints] = useState<number>(0)
  const [mounted, setMounted] = useState(false)

  const isAuthRoute = pathname === '/team/login' || pathname === '/team/register'

  useEffect(() => {
    setMounted(true)
    if (isAuthRoute) return

    const raw = localStorage.getItem('cipherx_team_session')
    if (!raw) {
      router.replace('/team/login')
      return
    }
    try {
      const parsed: TeamSession = JSON.parse(raw)
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem('cipherx_team_session')
        router.replace('/team/login')
        return
      }
      setSession(parsed)
      fetchPoints(parsed.teamId)
    } catch {
      localStorage.removeItem('cipherx_team_session')
      router.replace('/team/login')
    }
  }, [router, isAuthRoute])

  async function fetchPoints(teamId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('teams')
      .select('total_points')
      .eq('id', teamId)
      .single()
    if (data) setPoints(data.total_points)
  }

  function handleSignOut() {
    localStorage.removeItem('cipherx_team_session')
    router.replace('/team/login')
  }

  if (isAuthRoute) {
    return <>{children}</>
  }

  if (!mounted || !session) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="spinner" style={{ width: '48px', height: '48px' }} />
          <div className="terminal" style={{ fontSize: '12px', color: 'var(--neon-green)', letterSpacing: '2px' }}>
            VERIFYING MISSION CREDENTIALS...
          </div>
        </div>
      </div>
    )
  }

  const navLinks = [
    { href: '/team/dashboard', label: 'MISSION HUB' },
    { href: '/team/scan', label: 'QR SCANNER' },
    { href: '/leaderboard', label: 'LIVE RANKINGS' },
  ]

  return (
    <div className="min-h-screen grid-bg scanlines" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Top Nav */}
      <nav style={{
        background: 'rgba(10,10,15,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,255,65,0.15)',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 0 20px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          maxWidth: '1400px', margin: '0 auto',
          padding: '0 16px',
          height: '60px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          {/* Left: Logo + nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="/team/dashboard" style={{ textDecoration: 'none' }}>
              <span
                className="terminal"
                style={{
                  fontSize: '20px', fontWeight: 900, color: 'var(--neon-green)',
                  letterSpacing: '4px',
                  textShadow: '0 0 15px rgba(0,255,65,0.6)'
                }}
              >
                CIPHERX
              </span>
            </Link>

            {/* Nav links (desktop) */}
            <div style={{ display: 'flex', gap: '4px' }} className="nav-links">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    textDecoration: 'none',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '1px',
                    color: pathname === link.href ? 'var(--neon-green)' : 'var(--text-muted)',
                    background: pathname === link.href ? 'rgba(0,255,65,0.08)' : 'transparent',
                    border: pathname === link.href ? '1px solid rgba(0,255,65,0.2)' : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: team info + sign out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Points badge */}
            <div className="badge-green" style={{ padding: '4px 12px', fontSize: '12px' }}>
              ⬡ {points.toLocaleString()} pts
            </div>

            {/* Team ID badge */}
            <div className="badge-blue hidden sm:flex" style={{ padding: '4px 12px', fontSize: '12px' }}>
              {session.teamCode} // {session.teamName}
            </div>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="terminal"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                letterSpacing: '1px',
              }}
              title="Leave mission"
            >
              EXIT
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '16px',
        textAlign: 'center',
        background: 'rgba(10,10,15,0.9)'
      }}>
        <p className="terminal" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
          CIPHERX 2026 // UX CLUB TECH TREASURE HUNT // SECURE SESSION: {session.teamCode}
        </p>
      </footer>
    </div>
  )
}
