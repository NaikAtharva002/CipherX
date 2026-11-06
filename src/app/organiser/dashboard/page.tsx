'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import TeamModal from '@/components/organiser/TeamModal'
import toast from 'react-hot-toast'
import type { Team, Checkpoint, Submission, EventSettings } from '@/types/database'

export default function OrganiserDashboardPage() {
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [recentSubmissions, setRecentSubmissions] = useState<(Submission & { team?: Team; challenge?: { title: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('--:--:--')

  useEffect(() => {
    fetchDashboardData()

    // Real-time subscriptions
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchTeams()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'submissions' }, () => {
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

  // Timer countdown
  useEffect(() => {
    if (!eventSettings?.end_time || eventSettings.status !== 'active') {
      if (eventSettings?.status === 'upcoming') setTimeLeft('T-MINUS')
      else if (eventSettings?.status === 'paused') setTimeLeft('PAUSED')
      else if (eventSettings?.status === 'ended') setTimeLeft('COMPLETED')
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

  async function fetchDashboardData() {
    setLoading(true)
    await Promise.all([fetchSettings(), fetchTeams(), fetchCheckpoints(), fetchSubmissions()])
    setLoading(false)
  }

  async function fetchSettings() {
    const supabase = createClient()
    const { data } = await supabase.from('event_settings').select('*').single()
    if (data) setEventSettings(data)
  }

  async function fetchTeams() {
    const supabase = createClient()
    const { data } = await supabase.from('teams').select('*').order('total_points', { ascending: false })
    if (data) setTeams(data)
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
      .select('*, teams(id, team_id, name), challenges(title)')
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setRecentSubmissions(
        data.map((s: any) => ({
          ...s,
          team: s.teams,
          challenge: s.challenges,
        }))
      )
    }
  }

  async function handleEventControl(action: 'start' | 'pause' | 'resume' | 'end') {
    if (action === 'end' && !confirm('Are you sure you want to end the mission? This will close all submissions.')) {
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch('/api/event/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(`Event action: ${action.toUpperCase()} successful`)
        fetchDashboardData()
      } else {
        toast.error(result.error || 'Failed to update event state')
      }
    } catch {
      toast.error('Network error during event control')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleResetEvent() {
    if (!confirm('DANGER: This will purge all submissions, team progress, and reset all scores to 0. Are you sure?')) {
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch('/api/event/reset', { method: 'POST', body: JSON.stringify({}) })
      const result = await res.json()
      if (result.success) {
        toast.success('Event reset to initial state')
        fetchDashboardData()
      } else {
        toast.error(result.error || 'Reset failed')
      }
    } catch {
      toast.error('Network error during event reset')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div className="terminal" style={{ color: 'var(--neon-green)', fontSize: '13px', letterSpacing: '2px' }}>
            SCANNING SYSTEM TELEMETRY...
          </div>
        </div>
      </div>
    )
  }

  const activeTeamsCount = teams.filter(t => t.status === 'active').length
  const completedTeamsCount = teams.filter(t => t.status === 'completed').length

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Top Banner / Event State */}
      <div
        className="glow-card"
        style={{
          padding: '24px 28px',
          marginBottom: '28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(10,10,15,0.98) 100%)',
          borderLeft: '4px solid var(--neon-green)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span
              className={`badge-${
                eventSettings?.status === 'active'
                  ? 'green'
                  : eventSettings?.status === 'paused'
                  ? 'yellow'
                  : eventSettings?.status === 'ended'
                  ? 'red'
                  : 'blue'
              }`}
              style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px' }}
            >
              ● {eventSettings?.status || 'UPCOMING'}
            </span>
            <span className="terminal" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              EVENT ID: CIPHERX-2026
            </span>
          </div>
          <h1
            className="terminal"
            style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '1px',
              margin: '0 0 6px 0',
            }}
          >
            {eventSettings?.name || 'CIPHERX 2026'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, maxWidth: '600px' }}>
            {eventSettings?.description || 'UX Club Tech Treasure Hunt Platform'}
          </p>
        </div>

        {/* Timer & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '4px' }}>
              MISSION CLOCK
            </div>
            <div className="countdown-digit" style={{ fontSize: '36px' }}>
              {timeLeft}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {eventSettings?.status === 'upcoming' && (
              <button
                onClick={() => handleEventControl('start')}
                disabled={actionLoading}
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '12px', background: 'rgba(0,255,65,0.1)' }}
              >
                ▶ START MISSION
              </button>
            )}
            {eventSettings?.status === 'active' && (
              <>
                <button
                  onClick={() => handleEventControl('pause')}
                  disabled={actionLoading}
                  className="terminal"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid #f59e0b',
                    color: '#f59e0b',
                    padding: '10px 16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ⏸ PAUSE
                </button>
                <button
                  onClick={() => handleEventControl('end')}
                  disabled={actionLoading}
                  className="terminal"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    padding: '10px 16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ⏹ END EVENT
                </button>
              </>
            )}
            {eventSettings?.status === 'paused' && (
              <button
                onClick={() => handleEventControl('resume')}
                disabled={actionLoading}
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '12px' }}
              >
                ▶ RESUME
              </button>
            )}
            {eventSettings?.status === 'ended' && (
              <button
                onClick={handleResetEvent}
                disabled={actionLoading}
                className="terminal"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  padding: '10px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ↺ RESET EVENT
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {[
          { label: 'REGISTERED TEAMS', value: teams.length, color: 'var(--neon-green)', sub: 'Ready for action' },
          { label: 'ACTIVE TEAMS ON FIELD', value: activeTeamsCount, color: 'var(--electric-blue)', sub: 'In combat' },
          { label: 'VAULT COMPLETED', value: completedTeamsCount, color: 'var(--purple-accent)', sub: 'Mission complete' },
          { label: 'ACTIVE CHECKPOINTS', value: checkpoints.filter(c => c.is_active).length, color: '#f59e0b', sub: `Total ${checkpoints.length}` },
          { label: 'SUBMISSIONS LOGGED', value: recentSubmissions.length, color: '#10b981', sub: 'Audited in real-time' },
        ].map(stat => (
          <div key={stat.label} className="glow-card" style={{ padding: '20px' }}>
            <div className="terminal" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>
              {stat.label}
            </div>
            <div className="terminal" style={{ fontSize: '32px', fontWeight: 800, color: stat.color, marginBottom: '4px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Grid: Team Progress Radar & Live Submissions Stream */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Team Matrix Progress */}
        <div className="glow-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="terminal" style={{ fontSize: '16px', color: 'var(--neon-green)', margin: '0 0 4px 0' }}>
                FIELD PROGRESS MATRIX
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Live radar of squad positions along the checkpoint path
              </p>
            </div>
            <Link
              href="/organiser/teams"
              className="terminal"
              style={{ fontSize: '11px', color: 'var(--electric-blue)', textDecoration: 'none' }}
            >
              MANAGE SQUADS →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {teams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No teams registered yet.
              </div>
            ) : (
              teams.slice(0, 6).map(team => {
                const totalCps = checkpoints.length || 1
                const currentCp = team.current_checkpoint_order || 0
                const percent = Math.min(100, Math.round((currentCp / totalCps) * 100))

                return (
                  <div
                    key={team.id}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="badge-blue" style={{ fontSize: '11px' }}>
                          {team.team_id}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                          {team.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="terminal" style={{ color: 'var(--neon-green)', fontSize: '12px' }}>
                          {team.total_points} PTS
                        </span>
                        <span
                          className={`badge-${
                            team.status === 'completed' ? 'purple' : team.status === 'active' ? 'green' : 'yellow'
                          }`}
                          style={{ fontSize: '10px' }}
                        >
                          CP {currentCp} / {totalCps}
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="progress-bar" style={{ height: '6px' }}>
                      <div className="progress-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Live Submissions Log */}
        <div className="glow-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="terminal" style={{ fontSize: '16px', color: 'var(--electric-blue)', margin: '0 0 4px 0' }}>
                TRANSMISSION AUDIT STREAM
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Real-time intercept of answer submissions
              </p>
            </div>
            <Link
              href="/organiser/submissions"
              className="terminal"
              style={{ fontSize: '11px', color: 'var(--electric-blue)', textDecoration: 'none' }}
            >
              VIEW ALL →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
            {recentSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No transmission packets intercepted yet.
              </div>
            ) : (
              recentSubmissions.map(sub => (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: sub.is_correct ? 'rgba(0,255,65,0.04)' : 'rgba(239,68,68,0.04)',
                    border: `1px solid ${sub.is_correct ? 'rgba(0,255,65,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: sub.is_correct ? 'var(--neon-green)' : '#ef4444',
                        boxShadow: `0 0 8px ${sub.is_correct ? 'var(--neon-green)' : '#ef4444'}`,
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="terminal" style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                          {sub.team?.team_id || 'UNKNOWN'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          ({sub.team?.name})
                        </span>
                      </div>
                      <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        &quot;{sub.submitted_answer}&quot; {sub.challenge?.title ? `• ${sub.challenge.title}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      className={`badge-${sub.is_correct ? 'green' : 'red'}`}
                      style={{ fontSize: '11px', fontWeight: 700 }}
                    >
                      {sub.is_correct ? 'DECRYPTED' : 'BREACH FAILED'}
                    </span>
                    <div className="terminal" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(sub.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Access Control Grid */}
      <div className="glow-card" style={{ padding: '24px' }}>
        <h2 className="terminal" style={{ fontSize: '15px', color: '#fff', marginBottom: '16px', letterSpacing: '1px' }}>
          MISSION OPERATIONS & TOOLS
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <button
            onClick={() => setIsTeamModalOpen(true)}
            className="btn-primary"
            style={{ padding: '14px', fontSize: '12px', textAlign: 'center' }}
          >
            + REGISTER SQUAD
          </button>

          <Link
            href="/organiser/checkpoints"
            className="terminal"
            style={{
              textDecoration: 'none',
              padding: '14px',
              borderRadius: '6px',
              border: '1px solid rgba(0,191,255,0.4)',
              background: 'rgba(0,191,255,0.05)',
              color: 'var(--electric-blue)',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            ◎ QR & CHECKPOINTS
          </Link>

          <Link
            href="/organiser/control-room"
            className="terminal"
            style={{
              textDecoration: 'none',
              padding: '14px',
              borderRadius: '6px',
              border: '1px solid rgba(139,92,246,0.4)',
              background: 'rgba(139,92,246,0.05)',
              color: 'var(--purple-accent)',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            ⬡ AUDITORIUM CONTROL ROOM
          </Link>

          <Link
            href="/leaderboard"
            className="terminal"
            style={{
              textDecoration: 'none',
              padding: '14px',
              borderRadius: '6px',
              border: '1px solid rgba(0,255,65,0.4)',
              background: 'rgba(0,255,65,0.05)',
              color: 'var(--neon-green)',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            ◈ LIVE LEADERBOARD
          </Link>

          <Link
            href="/organiser/final-vault"
            className="terminal"
            style={{
              textDecoration: 'none',
              padding: '14px',
              borderRadius: '6px',
              border: '1px solid rgba(245,158,11,0.4)',
              background: 'rgba(245,158,11,0.05)',
              color: '#f59e0b',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            ★ THE FINAL VAULT
          </Link>
        </div>
      </div>

      {/* Team Modal */}
      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSaved={fetchTeams}
      />
    </div>
  )
}
