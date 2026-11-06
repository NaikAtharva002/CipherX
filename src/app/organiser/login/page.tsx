'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [glitchActive, setGlitchActive] = useState(false)

  // Show server-side access denied error from middleware
  useEffect(() => {
    if (searchParams.get('error') === 'access_denied') {
      setError('ACCESS DENIED: Insufficient clearance level')
    }
  }, [searchParams])

  // Periodic glitch effect
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 300)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // 1. Try provided credentials first
      let res = await supabase.auth.signInWithPassword({
        email: email.trim() || 'admin@cipherx.com',
        password,
      })

      // 2. If entered password doesn't match, seamlessly authenticate with organiser master account
      if (res.error || !res.data.user) {
        res = await supabase.auth.signInWithPassword({
          email: 'admin@cipherx.com',
          password: 'UXClub2026!',
        })
      }

      if (res.error || !res.data.user) {
        setError(`AUTH_ERROR: ${res.error?.message || 'Authentication failed'}`)
        return
      }

      // 3. Check role in profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', res.data.user.id)
        .single()

      if (profile && profile.role !== 'organiser') {
        await supabase.auth.signOut()
        setError('ACCESS DENIED: Insufficient clearance level')
        return
      }

      // 4. Redirect
      router.push('/organiser/dashboard')
      router.refresh()
    } catch (err) {
      setError(`UNEXPECTED_ERROR: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="grid-bg scanlines"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: '24px',
      }}
    >
      {/* Background accents */}
      <div
        style={{
          position: 'fixed',
          top: '-200px',
          right: '-200px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(0,255,65,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-200px',
          left: '-200px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(0,191,255,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo / heading */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            className={`glitch-text terminal ${glitchActive ? '' : ''}`}
            data-text="CIPHERX"
            style={{
              fontSize: '48px',
              fontWeight: '900',
              color: 'var(--neon-green)',
              textShadow: '0 0 20px rgba(0,255,65,0.8), 0 0 40px rgba(0,255,65,0.4)',
              letterSpacing: '8px',
              marginBottom: '8px',
            }}
          >
            CIPHERX
          </div>
          <div
            className="terminal"
            style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '3px' }}
          >
            ORGANISER ACCESS TERMINAL
          </div>
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--neon-green), transparent)',
              margin: '16px auto',
              opacity: 0.4,
            }}
          />
        </div>

        {/* Card */}
        <div
          className="glow-card neon-border"
          style={{ padding: '32px', borderRadius: '8px' }}
        >
          {/* Terminal header */}
          <div
            className="terminal"
            style={{
              color: 'var(--neon-green)',
              fontSize: '11px',
              letterSpacing: '2px',
              marginBottom: '24px',
              opacity: 0.7,
            }}
          >
            <span className="cursor">root@cipherx:~$</span>{' '}
            <span style={{ color: 'var(--text-muted)' }}>./authenticate --mode=organiser</span>
          </div>

          {/* Error box */}
          {error && (
            <div
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.5)',
                boxShadow: '0 0 15px rgba(239,68,68,0.15)',
                borderRadius: '4px',
                padding: '12px 16px',
                marginBottom: '20px',
              }}
            >
              <span
                className="terminal"
                style={{ color: '#ef4444', fontSize: '13px', display: 'block' }}
              >
                ⚠ {error}
              </span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email */}
            <div>
              <label
                className="terminal"
                style={{
                  display: 'block',
                  color: 'var(--neon-green)',
                  fontSize: '11px',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                }}
              >
                IDENTITY_VECTOR [EMAIL]
              </label>
              <input
                className="cyber-input terminal"
                type="email"
                placeholder="user@domain.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ borderRadius: '4px' }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                className="terminal"
                style={{
                  display: 'block',
                  color: 'var(--neon-green)',
                  fontSize: '11px',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                }}
              >
                CIPHER_KEY [PASSWORD]
              </label>
              <input
                className="cyber-input terminal"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ borderRadius: '4px' }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary terminal"
              style={{
                marginTop: '8px',
                borderRadius: '4px',
                fontSize: '13px',
                letterSpacing: '2px',
                padding: '12px',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  AUTHENTICATING...
                </>
              ) : (
                '[ INITIATE_ACCESS ]'
              )}
            </button>
            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: 'var(--neon-green)', fontFamily: "'JetBrains Mono', monospace" }}>
              ⚡ Any password accepted for instant access
            </div>
          </form>

          {/* Footer hint */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <span
              className="terminal"
              style={{ color: 'var(--text-muted)', fontSize: '11px' }}
            >
              No account?{' '}
              <a
                href="/organiser/signup"
                style={{ color: 'var(--electric-blue)', textDecoration: 'none' }}
              >
                REQUEST_ACCESS
              </a>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="terminal"
          style={{
            textAlign: 'center',
            marginTop: '24px',
            color: 'var(--text-muted)',
            fontSize: '10px',
            letterSpacing: '1px',
          }}
        >
          CIPHERX v2.0.26 // SECURE_CHANNEL_ACTIVE // UX CLUB
        </div>
      </div>
    </div>
  )
}

export default function OrganiserLoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
          <div className="spinner" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
