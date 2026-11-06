'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  label: string
  href: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/organiser/dashboard', icon: '◈' },
  { label: 'Squads & Teams', href: '/organiser/teams', icon: '◉' },
  { label: 'Checkpoints & QR', href: '/organiser/checkpoints', icon: '◎' },
  { label: 'Submissions Audit', href: '/organiser/submissions', icon: '◬' },
  { label: 'Control Room', href: '/organiser/control-room', icon: '⬡' },
  { label: 'The Final Vault', href: '/organiser/final-vault', icon: '★' },
  { label: 'Live Leaderboard', href: '/leaderboard', icon: '◇' },
  { label: 'Event Settings', href: '/organiser/settings', icon: '⚙' },
]

interface Props {
  userEmail: string
  userName: string
}

export default function OrganiserSidebar({ userEmail, userName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/organiser/login')
    router.refresh()
  }

  const sidebarContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '0',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid rgba(0,255,65,0.1)',
        }}
      >
        <div
          className="terminal glitch-text"
          data-text="CIPHERX"
          style={{
            fontSize: '22px',
            fontWeight: '900',
            color: 'var(--neon-green)',
            textShadow: '0 0 15px rgba(0,255,65,0.6)',
            letterSpacing: '4px',
          }}
        >
          CIPHERX
        </div>
        <div
          className="terminal"
          style={{ color: 'var(--text-muted)', fontSize: '10px', letterSpacing: '2px', marginTop: '4px' }}
        >
          ORGANISER CONSOLE
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                marginBottom: '4px',
                borderRadius: '6px',
                textDecoration: 'none',
                color: isActive ? 'var(--neon-green)' : 'var(--text-muted)',
                background: isActive
                  ? 'rgba(0,255,65,0.08)'
                  : 'transparent',
                border: isActive
                  ? '1px solid rgba(0,255,65,0.2)'
                  : '1px solid transparent',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <span style={{ fontSize: '16px', opacity: isActive ? 1 : 0.5 }}>
                {item.icon}
              </span>
              <span style={{ letterSpacing: '0.5px' }}>{item.label}</span>
              {isActive && (
                <span style={{ marginLeft: 'auto', color: 'var(--neon-green)', fontSize: '10px' }}>
                  ●
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + sign out */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(0,255,65,0.1)',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <div className="terminal" style={{ color: 'var(--neon-green)', fontSize: '12px' }}>
            {userName}
          </div>
          <div className="terminal" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            {userEmail}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="terminal"
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            letterSpacing: '1px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {signingOut ? (
            <><div className="spinner" style={{ width: '12px', height: '12px', borderTopColor: '#ef4444' }} /> SIGNING_OUT</>
          ) : (
            '⏻ SIGN_OUT'
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: '260px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid rgba(0,255,65,0.1)',
          zIndex: 40,
          display: 'none',
        }}
        className="desktop-sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid rgba(0,255,65,0.1)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          zIndex: 50,
        }}
        className="mobile-header"
      >
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--neon-green)',
            cursor: 'pointer',
            fontSize: '20px',
            marginRight: '12px',
          }}
        >
          ☰
        </button>
        <span
          className="terminal"
          style={{ color: 'var(--neon-green)', fontWeight: '900', letterSpacing: '3px', fontSize: '16px' }}
        >
          CIPHERX
        </span>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 60,
            }}
          />
          <aside
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              width: '260px',
              background: 'var(--bg-secondary)',
              borderRight: '1px solid rgba(0,255,65,0.1)',
              zIndex: 70,
            }}
          >
            {sidebarContent}
          </aside>
        </>
      )}

      <style>{`
        @media (min-width: 1024px) {
          .desktop-sidebar { display: block !important; }
          .mobile-header { display: none !important; }
        }
        @media (max-width: 1023px) {
          .desktop-sidebar { display: none !important; }
        }
      `}</style>
    </>
  )
}
