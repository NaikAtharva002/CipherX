'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Team, EventSettings, Checkpoint } from '@/types/database'

export default function PublicLeaderboardPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [timeLeft, setTimeLeft] = useState('--:--:--')

  useEffect(() => {
    fetchLeaderboard()

    // Real-time updates
    const supabase = createClient()
    const channel = supabase
      .channel('public-leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchTeams()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_settings' }, () => {
        fetchSettings()
      })
      .subscribe()

    // Fallback interval every 15s
    const refreshInterval = setInterval(() => {
      fetchTeams()
    }, 15000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(refreshInterval)
    }
  }, [])

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

  async function fetchLeaderboard() {
    setLoading(true)
    await Promise.all([fetchSettings(), fetchTeams(), fetchCheckpoints()])
    setLoading(false)
  }

  async function fetchSettings() {
    const supabase = createClient()
    const { data } = await supabase.from('event_settings').select('*').single()
    if (data) setEventSettings(data)
  }

  async function fetchTeams() {
    const supabase = createClient()
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('total_points', { ascending: false })
      .order('total_penalties_seconds', { ascending: true })

    if (data) setTeams(data)
  }

  async function fetchCheckpoints() {
    const supabase = createClient()
    const { data } = await supabase.from('checkpoints').select('*').order('order_index', { ascending: true })
    if (data) setCheckpoints(data)
  }

  const filteredTeams = teams.filter(
    t =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.team_id.toLowerCase().includes(search.toLowerCase())
  )

  const topTeam = teams[0]
  const totalCheckpoints = checkpoints.length || 5

  return (
    <div className="min-h-screen grid-bg scanlines" style={{ padding: '24px', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Navigation Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
            borderBottom: '1px solid rgba(0,255,65,0.15)',
            paddingBottom: '16px',
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div className="terminal glitch-text" data-text="CIPHERX" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--neon-green)', letterSpacing: '4px' }}>
              CIPHERX
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link
              href="/team/dashboard"
              className="terminal"
              style={{
                textDecoration: 'none',
                color: 'var(--electric-blue)',
                fontSize: '12px',
                border: '1px solid rgba(0,191,255,0.3)',
                padding: '6px 14px',
                borderRadius: '4px',
              }}
            >
              MISSION HUB →
            </Link>
            <Link
              href="/organiser/dashboard"
              className="terminal"
              style={{
                textDecoration: 'none',
                color: 'var(--text-muted)',
                fontSize: '12px',
              }}
            >
              Organiser Console
            </Link>
          </div>
        </div>

        {/* Header Hero */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="badge-green" style={{ display: 'inline-block', marginBottom: '8px', letterSpacing: '2px' }}>
            ● LIVE SATELLITE TELEMETRY
          </div>
          <h1
            className="terminal glitch-text"
            data-text="MISSION LEADERBOARD"
            style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '2px',
              margin: '0 0 8px 0',
            }}
          >
            MISSION LEADERBOARD
          </h1>
          <p className="terminal" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {eventSettings?.name || 'CIPHERX 2026'} // OFFICIAL GLOBAL RANKINGS
          </p>
        </div>

        {/* Stats Ribbon */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div className="glow-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
              MISSION CLOCK
            </div>
            <div className="terminal" style={{ fontSize: '28px', fontWeight: 900, color: 'var(--neon-green)', marginTop: '4px' }}>
              {timeLeft}
            </div>
          </div>

          <div className="glow-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
              SQUADS COMPETING
            </div>
            <div className="terminal" style={{ fontSize: '28px', fontWeight: 900, color: 'var(--electric-blue)', marginTop: '4px' }}>
              {teams.length}
            </div>
          </div>

          <div className="glow-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
              TOP SCORE (APEX)
            </div>
            <div className="terminal" style={{ fontSize: '28px', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
              {topTeam?.total_points || 0} PTS
            </div>
          </div>

          <div className="glow-card" style={{ padding: '16px 20px', textAlign: 'center' }}>
            <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
              CURRENT LEADER
            </div>
            <div className="terminal" style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {topTeam ? `${topTeam.name} (${topTeam.team_id})` : 'AWAITING SIGNALS'}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search squad name or team code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cyber-input"
            style={{ padding: '10px 16px', fontSize: '13px' }}
          />
        </div>

        {/* Leaderboard Table */}
        <div className="glow-card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <div className="terminal" style={{ color: 'var(--neon-green)', fontSize: '12px' }}>
                DOWNLOADING SATELLITE RANKINGS...
              </div>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="terminal">NO SQUADS FOUND</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center' }}>RANK</th>
                    <th>SQUAD IDENTIFIER</th>
                    <th>PROGRESS</th>
                    <th>TOTAL POINTS</th>
                    <th>PENALTIES</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team, idx) => {
                    const rank = idx + 1
                    const isTop3 = rank <= 3
                    const rankColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : 'rgba(255,255,255,0.1)'
                    const currentCp = team.current_checkpoint_order || 0
                    const percent = Math.min(100, Math.round((currentCp / totalCheckpoints) * 100))

                    return (
                      <tr
                        key={team.id}
                        style={{
                          background: rank === 1 ? 'rgba(251,191,36,0.05)' : isTop3 ? 'rgba(0,191,255,0.02)' : 'transparent',
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="terminal"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: rankColor,
                              color: isTop3 ? '#000' : '#fff',
                              fontWeight: 900,
                              fontSize: '13px',
                              boxShadow: isTop3 ? `0 0 12px ${rankColor}` : 'none',
                            }}
                          >
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="badge-blue" style={{ fontSize: '11px', fontWeight: 700 }}>
                              {team.team_id}
                            </span>
                            <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>
                              {team.name}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="terminal" style={{ fontSize: '12px', color: '#fff' }}>
                              {currentCp} / {totalCheckpoints} Sectors
                            </span>
                          </div>
                          <div className="progress-bar" style={{ height: '5px', width: '120px', marginTop: '4px' }}>
                            <div className="progress-fill" style={{ width: `${percent}%` }} />
                          </div>
                        </td>
                        <td>
                          <span
                            className="terminal"
                            style={{
                              fontSize: '18px',
                              fontWeight: 900,
                              color: 'var(--neon-green)',
                              textShadow: '0 0 10px rgba(0,255,65,0.4)',
                            }}
                          >
                            {team.total_points.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span
                            className="terminal"
                            style={{
                              fontSize: '12px',
                              color: team.total_penalties_seconds > 0 ? '#ef4444' : 'var(--text-muted)',
                            }}
                          >
                            +{team.total_penalties_seconds}s
                          </span>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {team.hints_used} hint{team.hints_used === 1 ? '' : 's'}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge-${
                              team.status === 'completed'
                                ? 'purple'
                                : team.status === 'active'
                                ? 'green'
                                : 'yellow'
                            }`}
                            style={{ fontSize: '11px', textTransform: 'uppercase' }}
                          >
                            ● {team.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
