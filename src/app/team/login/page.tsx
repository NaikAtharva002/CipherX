'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function TeamLoginPage() {
  const router = useRouter()
  const [teamCode, setTeamCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const code = teamCode.trim().toUpperCase()

      // Fetch team by team_id (any password is accepted)
      let { data: team } = await supabase
        .from('teams')
        .select('*')
        .eq('team_id', code)
        .maybeSingle()

      // If team ID not found or blank, fallback to first active team (e.g. TEAM001)
      if (!team) {
        const { data: fallbackTeam } = await supabase
          .from('teams')
          .select('*')
          .limit(1)
          .maybeSingle()
        team = fallbackTeam
      }

      // If database has no teams yet, auto-create one
      if (!team) {
        const { data: newTeam } = await supabase
          .from('teams')
          .insert({
            team_id: code || 'TEAM001',
            name: code ? `Squad ${code}` : 'Alpha Squad',
            password: password || 'nopass',
            total_points: 0,
            status: 'active',
          })
          .select()
          .single()
        team = newTeam
      }

      if (!team) {
        setError('ACCESS DENIED: Could not initialize squad session.')
        setLoading(false)
        return
      }

      // Store session in localStorage
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      const session = {
        teamId: team.id,
        teamCode: team.team_id,
        teamName: team.name,
        expiresAt,
      }
      localStorage.setItem('cipherx_team_session', JSON.stringify(session))

      router.push('/team/dashboard')
    } catch (err) {
      console.error(err)
      setError('An unexpected system error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg scanlines flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(0,255,65,0.03) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,191,255,0.03) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '4px', marginBottom: '8px' }}>
            &gt; SECURE TERMINAL GATEWAY
          </div>
          <h1
            className="glitch-text terminal"
            data-text="CIPHERX"
            style={{
              fontSize: '48px',
              fontWeight: 900,
              color: 'var(--neon-green)',
              letterSpacing: '6px',
              textShadow: '0 0 20px rgba(0,255,65,0.6)',
              margin: '0 0 8px 0',
            }}
          >
            CIPHERX
          </h1>
          <div className="badge-blue" style={{ display: 'inline-block', fontSize: '11px', letterSpacing: '2px' }}>
            FIELD AGENT AUTHENTICATION
          </div>
        </div>

        {/* Card */}
        <div className="glow-card" style={{ padding: '32px' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '6px',
              padding: '12px 14px',
              marginBottom: '20px',
              color: '#ef4444',
              fontSize: '13px',
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label
                className="terminal"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--neon-green)',
                  letterSpacing: '2px',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}
              >
                Team ID Code
              </label>
              <input
                type="text"
                value={teamCode}
                onChange={e => setTeamCode(e.target.value.toUpperCase())}
                placeholder="e.g. TEAM001"
                required
                className="cyber-input"
                style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: "'JetBrains Mono', monospace" }}>
                Provided during team registration (e.g. TEAM001)
              </div>
            </div>

            <div>
              <label
                className="terminal"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: 'var(--neon-green)',
                  letterSpacing: '2px',
                  marginBottom: '8px',
                  textTransform: 'uppercase'
                }}
              >
                Access Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="cyber-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '13px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  AUTHENTICATING...
                </>
              ) : (
                'ENTER MISSION CONTROL →'
              )}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            <Link
              href="/team/register"
              style={{ color: 'var(--electric-blue)', textDecoration: 'none' }}
            >
              + Register New Team
            </Link>
            <Link
              href="/organiser/login"
              style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
            >
              Organiser Login
            </Link>
          </div>
        </div>

        {/* Quick Demo Credentials Help */}
        <div className="glow-card" style={{ marginTop: '16px', padding: '16px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>
          <div style={{ color: 'var(--neon-green)', marginBottom: '4px', fontWeight: 600 }}>⚡ INSTANT ACCESS MODE:</div>
          <div>Enter any Team ID (e.g. <span style={{ color: '#fff' }}>TEAM001</span>, <span style={{ color: '#fff' }}>TEAM002</span>) with <span style={{ color: 'var(--neon-green)' }}>ANY password</span> to enter!</div>
        </div>
      </div>
    </div>
  )
}
