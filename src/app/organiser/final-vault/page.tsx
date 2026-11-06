'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Team, EventSettings, Checkpoint } from '@/types/database'

export default function FinalVaultPage() {
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null)
  const [finalCheckpoint, setFinalCheckpoint] = useState<Checkpoint | null>(null)
  const [completedTeams, setCompletedTeams] = useState<Team[]>([])
  const [activeTeams, setActiveTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [hint, setHint] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [winningTeam, setWinningTeam] = useState<Team | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchVaultData()

    const supabase = createClient()
    const channel = supabase
      .channel('final-vault-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchTeams()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchVaultData() {
    setLoading(true)
    await Promise.all([fetchSettings(), fetchFinalCheckpoint(), fetchTeams()])
    setLoading(false)
  }

  async function fetchSettings() {
    const supabase = createClient()
    const { data } = await supabase.from('event_settings').select('*').single()
    if (data) {
      setEventSettings(data)
      setPassword(data.final_vault_password || 'UXCLUB2026')
      setHint(data.final_vault_hint || '')
    }
  }

  async function fetchFinalCheckpoint() {
    const supabase = createClient()
    const { data } = await supabase.from('checkpoints').select('*').eq('is_final', true).maybeSingle()
    if (data) setFinalCheckpoint(data)
  }

  async function fetchTeams() {
    const supabase = createClient()
    const { data } = await supabase.from('teams').select('*').order('total_points', { ascending: false })
    if (data) {
      setCompletedTeams(data.filter(t => t.status === 'completed'))
      setActiveTeams(data.filter(t => t.status === 'active'))
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) {
      toast.error('Password cannot be empty')
      return
    }

    setSaving(true)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('event_settings')
        .update({
          final_vault_password: password.trim(),
          final_vault_hint: hint.trim() || null,
        })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) throw error
      toast.success('Final vault credentials updated!')
      fetchSettings()
    } catch {
      toast.error('Failed to update vault password')
    } finally {
      setSaving(false)
    }
  }

  function handleDeclareWinner(team: Team) {
    if (confirm(`OFFICIALLY DECLARE ${team.name} (${team.team_id}) AS THE GRAND CHAMPIONS OF CIPHERX?`)) {
      setWinningTeam(team)
      toast.success(`VICTORY DECLARED FOR ${team.name}!`, { duration: 6000 })
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div className="terminal" style={{ color: 'var(--purple-accent)', fontSize: '13px' }}>
            CONNECTING TO THE VAULT...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Winner Banner if Declared */}
      {winningTeam && (
        <div
          className="glow-card"
          style={{
            padding: '32px',
            marginBottom: '32px',
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.2) 0%, rgba(10,10,15,0.95) 100%)',
            border: '2px solid var(--purple-accent)',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(139,92,246,0.5)',
          }}
        >
          <div className="terminal" style={{ fontSize: '14px', color: '#fbbf24', letterSpacing: '4px', marginBottom: '8px' }}>
            🏆 OFFICIAL GRAND CHAMPIONS OF CIPHERX 🏆
          </div>
          <h2
            className="terminal glitch-text"
            data-text={winningTeam.name}
            style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#fff',
              margin: '0 0 8px 0',
              textShadow: '0 0 20px rgba(139,92,246,0.8)',
            }}
          >
            {winningTeam.name}
          </h2>
          <div className="terminal" style={{ fontSize: '18px', color: 'var(--neon-green)', marginBottom: '16px' }}>
            SQUAD ID: {winningTeam.team_id} • FINAL SCORE: {winningTeam.total_points} PTS
          </div>
          <button
            onClick={() => setWinningTeam(null)}
            className="terminal"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'var(--text-muted)',
              padding: '6px 14px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            DISMISS BANNER
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div className="terminal" style={{ fontSize: '11px', color: 'var(--purple-accent)', letterSpacing: '2px', marginBottom: '4px' }}>
          LEVEL OMEGA // APEX ROUND
        </div>
        <h1 className="terminal" style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: 0 }}>
          THE FINAL VAULT CONTROL
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
          Oversee the final endgame: manage vault passphrase, monitor squad completions, and crown the victor
        </p>
      </div>

      {/* Grid: Vault Passphrase Config & Finalists Tracker */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Passphrase & Hint Config */}
        <div className="glow-card" style={{ padding: '28px', borderLeft: '4px solid var(--purple-accent)' }}>
          <h2 className="terminal" style={{ fontSize: '16px', color: 'var(--purple-accent)', marginBottom: '16px' }}>
            MASTER VAULT CIPHER & CLUE
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Participants must combine clues collected across all checkpoints to deduce or submit this passphrase.
          </p>

          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)' }}>
                  FINAL VAULT PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="terminal"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--electric-blue)',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? 'HIDE' : 'REVEAL'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="cyber-input"
                style={{ fontSize: '16px', letterSpacing: '2px' }}
              />
            </div>

            <div>
              <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '6px' }}>
                FINAL CLUE / GUIDANCE TRANSMISSION
              </label>
              <textarea
                value={hint}
                onChange={e => setHint(e.target.value)}
                placeholder="e.g. Combine the first letter of each completed sector code..."
                rows={3}
                className="cyber-input"
              />
            </div>

            {finalCheckpoint && (
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', fontSize: '12px' }}>
                <div className="terminal" style={{ color: 'var(--electric-blue)', marginBottom: '4px' }}>
                  PHYSICAL VAULT SECTOR:
                </div>
                <div style={{ color: '#fff', fontWeight: 600 }}>{finalCheckpoint.title}</div>
                <div style={{ color: 'var(--text-muted)' }}>Location: {finalCheckpoint.location || 'Stage'}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ padding: '12px', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}
            >
              {saving ? 'UPDATING...' : 'UPDATE MASTER VAULT KEY'}
            </button>
          </form>
        </div>

        {/* Completed Squads & Winner Declaration */}
        <div className="glow-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="terminal" style={{ fontSize: '16px', color: '#fbbf24', margin: 0 }}>
              VAULT BREACHERS ({completedTeams.length})
            </h2>
            <span className="badge-purple" style={{ fontSize: '10px' }}>
              FINALISTS
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Squads that successfully decrypted all sectors and cracked the final vault:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
            {completedTeams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No squads have breached the Final Vault yet. Hunt in progress.
              </div>
            ) : (
              completedTeams.map((team, idx) => (
                <div
                  key={team.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    background: idx === 0 ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${idx === 0 ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="terminal" style={{ color: '#fbbf24', fontWeight: 800 }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>
                        {team.name}
                      </span>
                      <span className="badge-blue" style={{ fontSize: '10px' }}>
                        {team.team_id}
                      </span>
                    </div>
                    <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Breached: {team.completed_at ? new Date(team.completed_at).toLocaleTimeString() : 'Verified'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="terminal" style={{ color: 'var(--neon-green)', fontWeight: 800, fontSize: '14px' }}>
                      {team.total_points} PTS
                    </span>
                    <button
                      onClick={() => handleDeclareWinner(team)}
                      className="terminal"
                      style={{
                        background: 'rgba(251,191,36,0.15)',
                        border: '1px solid #fbbf24',
                        color: '#fbbf24',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      ★ DECLARE WINNER
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
