'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface ScanResult {
  valid: boolean
  message: string
  error?: string
  checkpoint?: { title: string; order_index: number }
  pointsEarned?: number
  alreadyCompleted?: boolean
}

export default function ScanLandingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [teamName, setTeamName] = useState<string | null>(null)

  useEffect(() => {
    handleScan()
  }, [token])

  async function handleScan() {
    setLoading(true)
    const rawSession = localStorage.getItem('cipherx_team_session')

    if (!rawSession) {
      // Save pending token so after login they are redirected back
      localStorage.setItem('pending_qr_token', token)
      setLoading(false)
      setResult({
        valid: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'You must log in to your squad account to verify this sector checkpoint.',
      })
      return
    }

    try {
      const session = JSON.parse(rawSession)
      setTeamName(session.teamName)

      const res = await fetch('/api/scan-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: token,
          teamId: session.teamId,
        }),
      })

      const data = await res.json()
      setResult(data)

      if (data.valid && !data.alreadyCompleted) {
        // Auto-redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/team/dashboard')
        }, 2200)
      }
    } catch {
      setResult({
        valid: false,
        error: 'NETWORK_ERROR',
        message: 'Could not connect to command servers. Check cellular/wifi signal.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg scanlines flex items-center justify-center p-4">
      <div style={{ maxWidth: '480px', width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)', letterSpacing: '4px', marginBottom: '8px' }}>
            &gt; SATELLITE QR DECRYPTION BEACON
          </div>
          <h1 className="terminal glitch-text" data-text="SECTOR SCAN" style={{ fontSize: '36px', fontWeight: 900, color: '#fff', margin: 0 }}>
            SECTOR SCAN
          </h1>
        </div>

        {/* Card */}
        <div className="glow-card" style={{ padding: '32px', textAlign: 'center' }}>
          {loading ? (
            <div style={{ padding: '40px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <div className="terminal" style={{ color: 'var(--neon-green)', fontSize: '13px', letterSpacing: '2px' }}>
                VERIFYING BEACON SIGNATURE...
              </div>
            </div>
          ) : result?.error === 'AUTHENTICATION_REQUIRED' ? (
            <div>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
              <h2 className="terminal" style={{ fontSize: '18px', color: 'var(--electric-blue)', marginBottom: '8px' }}>
                AUTHENTICATION REQUIRED
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
                {result.message}
              </p>
              <Link
                href="/team/login"
                className="btn-primary"
                style={{ display: 'inline-block', padding: '12px 28px', textDecoration: 'none' }}
              >
                LOG IN SQUAD PORTAL →
              </Link>
            </div>
          ) : result?.valid && !result?.alreadyCompleted ? (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
              <span className="badge-green" style={{ fontSize: '12px', padding: '4px 14px' }}>
                ✓ CHECKPOINT VERIFIED
              </span>
              <h2 className="terminal" style={{ fontSize: '24px', color: '#fff', marginTop: '16px', marginBottom: '8px' }}>
                {result.checkpoint?.title || 'Sector Checkpoint'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                Access granted for Squad <strong style={{ color: '#fff' }}>{teamName}</strong>. Unlocking challenge on mission hub...
              </p>
              <div className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)' }}>
                REDIRECTING TO MISSION HUB...
              </div>
            </div>
          ) : result?.alreadyCompleted ? (
            <div>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>✓</div>
              <span className="badge-purple" style={{ fontSize: '12px', padding: '4px 14px' }}>
                SECTOR ALREADY CLEARED
              </span>
              <h2 className="terminal" style={{ fontSize: '20px', color: '#fff', marginTop: '16px', marginBottom: '8px' }}>
                {result.checkpoint?.title || 'Sector'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
                {result.message}
              </p>
              <Link
                href="/team/dashboard"
                className="btn-primary"
                style={{ display: 'inline-block', padding: '12px 28px', textDecoration: 'none' }}
              >
                RETURN TO MISSION HUB
              </Link>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⛔</div>
              <span className="badge-red" style={{ fontSize: '12px', padding: '4px 14px' }}>
                {result?.error || 'INVALID SCAN'}
              </span>
              <h2 className="terminal" style={{ fontSize: '20px', color: '#ef4444', marginTop: '16px', marginBottom: '8px' }}>
                ACCESS BLOCKED
              </h2>
              <p style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '24px' }}>
                {result?.message || 'Out-of-sequence checkpoint scanned.'}
              </p>
              <Link
                href="/team/dashboard"
                className="btn-primary"
                style={{ display: 'inline-block', padding: '12px 28px', textDecoration: 'none' }}
              >
                RETURN TO ACTIVE MISSION
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
