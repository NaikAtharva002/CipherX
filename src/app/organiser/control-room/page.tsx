'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Team, Checkpoint, Submission, EventSettings } from '@/types/database'

export default function ControlRoomPage() {
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [checkpointLoads, setCheckpointLoads] = useState<Record<string, number>>({})
  const [alerts, setAlerts] = useState<{ id: string; msg: string; time: string; type: 'warn' | 'crit' }[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [timeLeft, setTimeLeft] = useState('--:--:--')
  const feedEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()

    const supabase = createClient()
    const channel = supabase
      .channel('control-room-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchTeams()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, payload => {
        handleNewSubmission(payload.new)
        fetchSubmissions()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_settings' }, () => {
        fetchSettings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function handleNewSubmission(newSub: any) {
    if (!newSub.is_correct) {
      setAlerts(prev => [
        {
          id: Math.random().toString(),
          msg: `Failed decryption packet logged on Checkpoint`,
          time: new Date().toLocaleTimeString(),
          type: 'warn',
        },
        ...prev.slice(0, 9),
      ])
    }
  }

  // Timer
  useEffect(() => {
    if (!eventSettings?.end_time || eventSettings.status !== 'active') {
      setTimeLeft(eventSettings?.status?.toUpperCase() || 'STANDBY')
      return
    }

    const interval = setInterval(() => {
      const diff = new Date(eventSettings.end_time!).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('00:00:00')
        clearInterval(interval)
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0')
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0')
        const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0')
        setTimeLeft(`${h}:${m}:${s}`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [eventSettings])

  async function fetchData() {
    await Promise.all([fetchSettings(), fetchTeams(), fetchCheckpoints(), fetchSubmissions(), fetchQrAudit()])
  }

  async function fetchSettings() {
    const supabase = createClient()
    const { data } = await supabase.from('event_settings').select('*').single()
    if (data) setEventSettings(data)
  }

  async function fetchTeams() {
    const supabase = createClient()
    const { data } = await supabase.from('teams').select('*').order('total_points', { ascending: false })
    if (data) {
      setTeams(data)
      // Calculate teams per checkpoint order
      const loads: Record<string, number> = {}
      data.forEach(t => {
        const key = `CP_${t.current_checkpoint_order}`
        loads[key] = (loads[key] || 0) + 1
      })
      setCheckpointLoads(loads)
    }
  }

  async function fetchCheckpoints() {
    const supabase = createClient()
    const { data } = await supabase.from('checkpoints').select('*').order('order_index', { ascending: true })
    if (data) setCheckpoints(data)
  }

  async function fetchSubmissions() {
    const supabase = createClient()
    const { data } = await supabase
      .from('submissions')
      .select('*, teams(name, team_id), checkpoints(title, order_index)')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) setSubmissions(data)
  }

  async function fetchQrAudit() {
    const supabase = createClient()
    const { data } = await supabase
      .from('qr_scans')
      .select('*, teams(team_id)')
      .eq('is_valid', false)
      .order('scanned_at', { ascending: false })
      .limit(5)

    if (data && data.length > 0) {
      setAlerts(prev => [
        ...data.map((d: any) => ({
          id: d.id,
          msg: `INVALID QR SCAN attempt by ${d.teams?.team_id || 'Unknown Squad'}: ${d.error_reason || 'Out of sequence'}`,
          time: new Date(d.scanned_at).toLocaleTimeString(),
          type: 'crit' as const,
        })),
        ...prev,
      ])
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const activeCount = teams.filter(t => t.status === 'active').length
  const completedCount = teams.filter(t => t.status === 'completed').length

  return (
    <div
      style={{
        background: '#07090e',
        minHeight: '100vh',
        color: '#e2e8f0',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Top Bar for Auditorium Display */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(0,255,65,0.2)',
          paddingBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="w-4 h-4 rounded-full bg-green-400 pulse-green" />
          <div>
            <div className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)', letterSpacing: '4px' }}>
              &gt; UX CLUB // LIVE MISSION THEATER
            </div>
            <h1
              className="terminal glitch-text"
              data-text="CIPHERX COMMAND THEATER"
              style={{
                fontSize: '26px',
                fontWeight: 900,
                color: '#fff',
                margin: 0,
                letterSpacing: '2px',
              }}
            >
              CIPHERX COMMAND THEATER
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Mission Timer */}
          <div
            style={{
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(0,255,65,0.3)',
              padding: '6px 20px',
              borderRadius: '6px',
              textAlign: 'center',
            }}
          >
            <div className="terminal" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
              MISSION TIME REMAINING
            </div>
            <div
              className="terminal"
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: 'var(--neon-green)',
                textShadow: '0 0 15px rgba(0,255,65,0.8)',
                lineHeight: 1.1,
              }}
            >
              {timeLeft}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="terminal"
            style={{
              background: 'rgba(0,191,255,0.1)',
              border: '1px solid var(--electric-blue)',
              color: 'var(--electric-blue)',
              padding: '10px 16px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              letterSpacing: '1px',
            }}
          >
            {isFullscreen ? 'EXIT FULLSCREEN' : '⛶ AUDITORIUM MODE'}
          </button>
        </div>
      </div>

      {/* Primary KPI Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: 'SQUADS ENGAGED', value: activeCount, color: 'var(--neon-green)', sub: 'In active field hunt' },
          { label: 'TOTAL TEAMS', value: teams.length, color: 'var(--electric-blue)', sub: 'Registered rosters' },
          { label: 'VAULT BREACHED', value: completedCount, color: 'var(--purple-accent)', sub: 'Finished all challenges' },
          { label: 'TRANSMISSIONS', value: submissions.length, color: '#f59e0b', sub: 'Decryptions received' },
        ].map(kpi => (
          <div
            key={kpi.label}
            className="glow-card"
            style={{ padding: '16px 20px', background: 'rgba(17,24,39,0.7)' }}
          >
            <div className="terminal" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
              {kpi.label}
            </div>
            <div className="terminal" style={{ fontSize: '38px', fontWeight: 900, color: kpi.color }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Display: Radar Map, Leaderboard, and Live Intercept Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr', gap: '20px', flex: 1 }}>
        {/* Left: Checkpoint Radar & Security Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Checkpoint Heat Map */}
          <div className="glow-card" style={{ padding: '20px', background: 'rgba(17,24,39,0.8)' }}>
            <div className="terminal" style={{ fontSize: '14px', color: 'var(--neon-green)', marginBottom: '16px', letterSpacing: '2px' }}>
              CHECKPOINT SECTOR DENSITY RADAR
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              {checkpoints.map(cp => {
                const teamsAtCp = checkpointLoads[`CP_${cp.order_index}`] || 0
                return (
                  <div
                    key={cp.id}
                    style={{
                      background: teamsAtCp > 0 ? 'rgba(0,255,65,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${teamsAtCp > 0 ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    <div className="terminal" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      SECTOR #{cp.order_index}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff', margin: '4px 0' }}>
                      {cp.title}
                    </div>
                    <div
                      className="terminal"
                      style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        color: teamsAtCp > 0 ? 'var(--neon-green)' : 'var(--text-muted)',
                      }}
                    >
                      {teamsAtCp}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      squads solving
                    </div>
                    {cp.is_final && (
                      <span className="badge-purple" style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '8px' }}>
                        VAULT
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Security & Anomaly Alerts */}
          <div className="glow-card" style={{ padding: '20px', background: 'rgba(17,24,39,0.8)', flex: 1 }}>
            <div className="terminal" style={{ fontSize: '14px', color: '#ef4444', marginBottom: '12px', letterSpacing: '2px' }}>
              SECURITY TELEMETRY & BREACH ALERTS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {alerts.length === 0 ? (
                <div className="terminal" style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '12px' }}>
                  ✓ All transmission vectors nominal. No security violations logged.
                </div>
              ) : (
                alerts.map(a => (
                  <div
                    key={a.id}
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#ef4444' }}>⚠</span>
                      <span className="terminal" style={{ color: '#fca5a5' }}>
                        {a.msg}
                      </span>
                    </div>
                    <span className="terminal" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {a.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Auditorium Leaderboard & Transmissions Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top 5 Squads */}
          <div className="glow-card" style={{ padding: '20px', background: 'rgba(17,24,39,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="terminal" style={{ fontSize: '14px', color: 'var(--electric-blue)', letterSpacing: '2px' }}>
                PRIMARY LEADERBOARD // APEX ROSTER
              </div>
              <Link href="/leaderboard" target="_blank" className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)', textDecoration: 'none' }}>
                OPEN AUDITORIUM VIEW ↗
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teams.slice(0, 6).map((team, idx) => (
                <div
                  key={team.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: idx === 0 ? 'rgba(0,255,65,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${idx === 0 ? 'var(--neon-green)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      className="terminal"
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                        {team.name}
                      </span>
                      <span className="badge-blue" style={{ marginLeft: '8px', fontSize: '10px' }}>
                        {team.team_id}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      CP {team.current_checkpoint_order}
                    </span>
                    <span className="terminal" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--neon-green)' }}>
                      {team.total_points} PTS
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submissions Intercept Stream */}
          <div className="glow-card" style={{ padding: '20px', background: 'rgba(17,24,39,0.8)', flex: 1 }}>
            <div className="terminal" style={{ fontSize: '14px', color: '#fff', marginBottom: '12px', letterSpacing: '2px' }}>
              INTERCEPTED SIGNALS (LIVE FEED)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {submissions.map(sub => (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: sub.is_correct ? 'rgba(0,255,65,0.03)' : 'rgba(239,68,68,0.03)',
                    borderLeft: `3px solid ${sub.is_correct ? 'var(--neon-green)' : '#ef4444'}`,
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="terminal" style={{ fontWeight: 700, color: '#fff' }}>
                      {sub.teams?.team_id || 'SQUAD'}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      CP {sub.checkpoints?.order_index || '?'}:
                    </span>
                    <span className="terminal" style={{ color: sub.is_correct ? 'var(--neon-green)' : '#fca5a5' }}>
                      &quot;{sub.submitted_answer}&quot;
                    </span>
                  </div>

                  <span className={`badge-${sub.is_correct ? 'green' : 'red'}`} style={{ fontSize: '9px' }}>
                    {sub.is_correct ? '+SOLVED' : 'FAILED'}
                  </span>
                </div>
              ))}
              <div ref={feedEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
