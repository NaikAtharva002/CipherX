'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface TeamSession {
  teamId: string
  teamCode: string
  teamName: string
}

export default function TeamScanPage() {
  const router = useRouter()
  const [session, setSession] = useState<TeamSession | null>(null)
  const [manualToken, setManualToken] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem('cipherx_team_session')
    if (!raw) {
      router.replace('/team/login')
      return
    }
    try {
      setSession(JSON.parse(raw))
    } catch {
      router.replace('/team/login')
    }
  }, [router])

  // Camera start
  async function startCamera() {
    setCameraError(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access not supported on this browser. Use manual token input.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setCameraActive(true)
      }
    } catch (err: unknown) {
      console.error(err)
      setCameraError('Camera permission denied or camera unavailable. Please use manual token entry.')
      setCameraActive(false)
    }
  }

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  async function processToken(tokenToVerify: string) {
    if (!session) return
    const cleanToken = tokenToVerify.trim()
    if (!cleanToken) {
      toast.error('Enter or scan a valid checkpoint token')
      return
    }

    setVerifying(true)
    try {
      // If token is a full URL, extract the token part
      let extractedToken = cleanToken
      if (cleanToken.includes('/scan/')) {
        extractedToken = cleanToken.split('/scan/')[1].split('?')[0].split('#')[0]
      }

      const res = await fetch('/api/scan-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: extractedToken,
          teamId: session.teamId,
        }),
      })

      const data = await res.json()
      if (data.valid) {
        toast.success(data.message || 'CHECKPOINT VERIFIED! Sector unlocked.', { duration: 4000 })
        stopCamera()
        router.push('/team/dashboard')
      } else {
        toast.error(data.message || data.error || 'Checkpoint verification failed.')
      }
    } catch {
      toast.error('Network failure during verification')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)', letterSpacing: '4px', marginBottom: '8px' }}>
          &gt; OPTICAL RECON SCANNER
        </div>
        <h1 className="terminal glitch-text" data-text="CHECKPOINT SCANNER" style={{ fontSize: '32px', fontWeight: 900, color: '#fff', margin: 0 }}>
          CHECKPOINT SCANNER
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
          Scan physical checkpoint QR codes stationed across campus or enter token
        </p>
      </div>

      {/* Camera Viewfinder Card */}
      <div className="glow-card" style={{ padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '360px',
            height: '280px',
            margin: '0 auto 20px',
            background: '#000',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '2px solid var(--neon-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0,255,65,0.2)',
          }}
        >
          {cameraActive ? (
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              playsInline
              muted
            />
          ) : (
            <div style={{ padding: '20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>📷</div>
              <div className="terminal" style={{ fontSize: '12px', color: 'var(--neon-green)' }}>
                OPTICAL SENSOR READY
              </div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                Tap activate to launch device camera
              </div>
            </div>
          )}

          {/* Scanner Overlay crosshair */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              bottom: '20px',
              border: '1px dashed rgba(0,255,65,0.4)',
              pointerEvents: 'none',
              borderRadius: '4px',
            }}
          />
        </div>

        {cameraError && (
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '6px',
              padding: '10px',
              marginBottom: '16px',
              color: '#ef4444',
              fontSize: '12px',
            }}
          >
            {cameraError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          {!cameraActive ? (
            <button
              type="button"
              onClick={startCamera}
              className="btn-primary"
              style={{ padding: '10px 24px', fontSize: '12px' }}
            >
              ACTIVATE CAMERA
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="terminal"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '10px 20px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              CLOSE CAMERA
            </button>
          )}
        </div>
      </div>

      {/* Manual Token Fallback */}
      <div className="glow-card" style={{ padding: '24px' }}>
        <h2 className="terminal" style={{ fontSize: '14px', color: 'var(--electric-blue)', marginBottom: '8px', letterSpacing: '1px' }}>
          MANUAL SECTOR CODE ENTRY
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
          If camera scan fails or lighting is low, input the token code printed below the checkpoint QR beacon:
        </p>

        <form
          onSubmit={e => {
            e.preventDefault()
            processToken(manualToken)
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div>
            <input
              type="text"
              placeholder="e.g. b8f7d9a1-4321-4f12... or URL"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              className="cyber-input"
              style={{ fontSize: '13px' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="btn-primary"
            style={{
              padding: '12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {verifying ? (
              <>
                <div className="spinner" style={{ width: '14px', height: '14px' }} />
                VERIFYING SECTOR TOKEN...
              </>
            ) : (
              'VERIFY CHECKPOINT →'
            )}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link
            href="/team/dashboard"
            className="terminal"
            style={{ color: 'var(--text-muted)', fontSize: '12px', textDecoration: 'none' }}
          >
            ← Return to Mission Hub
          </Link>
        </div>
      </div>
    </div>
  )
}
