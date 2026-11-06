'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INVITE_CODE = 'UXCLUB_ADMIN_2026'

export default function OrganiserSignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [glitchActive, setGlitchActive] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 300)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('CIPHER_MISMATCH: Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('SECURITY_FAIL: Password must be at least 8 characters')
      return
    }
    if (inviteCode.trim() !== INVITE_CODE) {
      setError('ACCESS DENIED: Invalid invite code — CLEARANCE REJECTED')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      if (signUpError) {
        setError(`SIGNUP_ERROR: ${signUpError.message}`)
        return
      }

      if (!authData.user) {
        setError('SYSTEM_ERROR: Failed to create user account')
        return
      }

      // 2. Insert profile with role='organiser'
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'organiser',
      })

      if (profileError) {
        // May already exist (trigger created it) — try upsert
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role: 'organiser',
        })
        if (upsertError) {
          setError(`PROFILE_ERROR: ${upsertError.message}`)
          return
        }
      }

      setSuccess(true)
    } catch (err) {
      setError(`UNEXPECTED_ERROR: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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
        <div style={{ width: '100%', maxWidth: '440px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: '64px',
              marginBottom: '16px',
              filter: 'drop-shadow(0 0 20px rgba(0,255,65,0.8))',
            }}
          >
            ✓
          </div>
          <h2
            className="terminal neon-green"
            style={{ fontSize: '24px', letterSpacing: '4px', marginBottom: '12px' }}
          >
            ACCESS GRANTED
          </h2>
          <p
            className="terminal"
            style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}
          >
            Organiser account created. Check your email to confirm, then{' '}
            <a href="/organiser/login" style={{ color: 'var(--electric-blue)' }}>
              log in
            </a>
            .
          </p>
        </div>
      </div>
    )
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
      {/* BG accents */}
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

      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div
            className={`glitch-text terminal`}
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
            REQUEST ORGANISER CLEARANCE
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
        <div className="glow-card neon-border" style={{ padding: '32px', borderRadius: '8px' }}>
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
            <span style={{ color: 'var(--text-muted)' }}>./register --mode=organiser</span>
          </div>

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
              <span className="terminal" style={{ color: '#ef4444', fontSize: '13px' }}>
                ⚠ {error}
              </span>
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label
                className="terminal"
                style={{ display: 'block', color: 'var(--neon-green)', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}
              >
                DISPLAY_NAME [FULL NAME]
              </label>
              <input
                className="cyber-input terminal"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{ borderRadius: '4px' }}
              />
            </div>

            <div>
              <label
                className="terminal"
                style={{ display: 'block', color: 'var(--neon-green)', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}
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
                style={{ borderRadius: '4px' }}
              />
            </div>

            <div>
              <label
                className="terminal"
                style={{ display: 'block', color: 'var(--neon-green)', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}
              >
                CIPHER_KEY [PASSWORD]
              </label>
              <input
                className="cyber-input terminal"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ borderRadius: '4px' }}
              />
            </div>

            <div>
              <label
                className="terminal"
                style={{ display: 'block', color: 'var(--neon-green)', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}
              >
                CONFIRM_KEY [REPEAT PASSWORD]
              </label>
              <input
                className="cyber-input terminal"
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ borderRadius: '4px' }}
              />
            </div>

            <div>
              <label
                className="terminal"
                style={{ display: 'block', color: 'var(--electric-blue)', fontSize: '11px', letterSpacing: '1px', marginBottom: '6px' }}
              >
                INVITE_TOKEN [REQUIRED]
              </label>
              <input
                className="cyber-input terminal"
                type="text"
                placeholder="XXXX_XXXX_0000"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                style={{ borderRadius: '4px', borderColor: 'rgba(0,191,255,0.3)' }}
              />
            </div>

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
                  CREATING_ACCOUNT...
                </>
              ) : (
                '[ REQUEST_CLEARANCE ]'
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <span className="terminal" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Already have access?{' '}
              <a href="/organiser/login" style={{ color: 'var(--electric-blue)', textDecoration: 'none' }}>
                AUTHENTICATE
              </a>
            </span>
          </div>
        </div>

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
          CIPHERX v2.0.26 // ENCRYPTED_CHANNEL // UX CLUB
        </div>
      </div>
    </div>
  )
}
