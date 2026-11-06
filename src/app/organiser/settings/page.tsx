'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { EventSettings } from '@/types/database'

export default function EventSettingsPage() {
  const [settings, setSettings] = useState<EventSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(180)
  const [maxTeams, setMaxTeams] = useState(50)
  const [hintPenaltySeconds, setHintPenaltySeconds] = useState(300)
  const [wrongAnswerPenaltySeconds, setWrongAnswerPenaltySeconds] = useState(60)
  const [allowHints, setAllowHints] = useState(true)
  const [autoCheckAnswers, setAutoCheckAnswers] = useState(true)
  const [finalVaultPassword, setFinalVaultPassword] = useState('')
  const [finalVaultHint, setFinalVaultHint] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('event_settings').select('*').single()

    if (error) {
      toast.error('Failed to load mission protocols')
    } else if (data) {
      setSettings(data)
      setName(data.name)
      setDescription(data.description || '')
      setDurationMinutes(data.duration_minutes)
      setMaxTeams(data.max_teams)
      setHintPenaltySeconds(data.hint_penalty_seconds)
      setWrongAnswerPenaltySeconds(data.wrong_answer_penalty_seconds)
      setAllowHints(data.allow_hints)
      setAutoCheckAnswers(data.auto_check_answers)
      setFinalVaultPassword(data.final_vault_password || '')
      setFinalVaultHint(data.final_vault_hint || '')
    }
    setLoading(false)
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return

    setSaving(true)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('event_settings')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          duration_minutes: durationMinutes,
          max_teams: maxTeams,
          hint_penalty_seconds: hintPenaltySeconds,
          wrong_answer_penalty_seconds: wrongAnswerPenaltySeconds,
          allow_hints: allowHints,
          auto_check_answers: autoCheckAnswers,
          final_vault_password: finalVaultPassword.trim() || null,
          final_vault_hint: finalVaultHint.trim() || null,
        })
        .eq('id', settings.id)

      if (error) throw error
      toast.success('Mission configuration protocols updated!')
      fetchSettings()
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to update protocol')
    } finally {
      setSaving(false)
    }
  }

  async function handleControl(action: 'start' | 'pause' | 'resume' | 'end') {
    if (action === 'end' && !confirm('Terminate the active mission? All submissions will lock.')) {
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch('/api/event/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, durationMinutes }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(`Mission State: ${action.toUpperCase()}`)
        fetchSettings()
      } else {
        toast.error(result.error || 'Control action rejected')
      }
    } catch {
      toast.error('Network failure')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleResetEvent() {
    if (!confirm('DANGER PURGE: Purge all submissions, hint requests, team progress, and reset all scores to 0?')) {
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch('/api/event/reset', { method: 'POST', body: JSON.stringify({}) })
      const result = await res.json()
      if (result.success) {
        toast.success('Full mission reset completed')
        fetchSettings()
      } else {
        toast.error(result.error || 'Reset error')
      }
    } catch {
      toast.error('Network failure')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div className="terminal" style={{ color: 'var(--neon-green)', fontSize: '13px' }}>
            DECRYPTING MISSION PROTOCOLS...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)', letterSpacing: '2px', marginBottom: '4px' }}>
          CORE CONFIGURATION // PROTOCOL 0
        </div>
        <h1 className="terminal" style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: 0 }}>
          EVENT SETTINGS & PROTOCOLS
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
          Configure time windows, penalty metrics, hint allowances, and mission controls
        </p>
      </div>

      {/* Mission State Card */}
      <div
        className="glow-card"
        style={{
          padding: '24px',
          marginBottom: '28px',
          background: 'linear-gradient(135deg, rgba(17,24,39,0.9) 0%, rgba(10,10,15,0.95) 100%)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        <div>
          <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '4px' }}>
            CURRENT MISSION STATUS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              className={`badge-${
                settings?.status === 'active'
                  ? 'green'
                  : settings?.status === 'paused'
                  ? 'yellow'
                  : settings?.status === 'ended'
                  ? 'red'
                  : 'blue'
              }`}
              style={{ fontSize: '14px', padding: '4px 14px' }}
            >
              ● {settings?.status?.toUpperCase()}
            </span>
            {settings?.start_time && (
              <span className="terminal" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Started: {new Date(settings.start_time).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {settings?.status === 'upcoming' && (
            <button
              onClick={() => handleControl('start')}
              disabled={actionLoading}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '12px' }}
            >
              ▶ INITIATE MISSION
            </button>
          )}
          {settings?.status === 'active' && (
            <>
              <button
                onClick={() => handleControl('pause')}
                disabled={actionLoading}
                className="terminal"
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid #f59e0b',
                  color: '#f59e0b',
                  padding: '12px 20px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ⏸ PAUSE MISSION
              </button>
              <button
                onClick={() => handleControl('end')}
                disabled={actionLoading}
                className="terminal"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  padding: '12px 20px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ⏹ TERMINATE MISSION
              </button>
            </>
          )}
          {settings?.status === 'paused' && (
            <button
              onClick={() => handleControl('resume')}
              disabled={actionLoading}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '12px' }}
            >
              ▶ RESUME MISSION
            </button>
          )}
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glow-card" style={{ padding: '28px' }}>
          <h2 className="terminal" style={{ fontSize: '16px', color: 'var(--neon-green)', marginBottom: '20px', letterSpacing: '1px' }}>
            GENERAL METRICS
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '8px' }}>
                EVENT TITLE *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="cyber-input"
              />
            </div>

            <div>
              <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '8px' }}>
                MISSION DURATION (MINUTES)
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={e => setDurationMinutes(parseInt(e.target.value) || 180)}
                required
                min={10}
                max={1440}
                className="cyber-input"
              />
            </div>

            <div>
              <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '8px' }}>
                MAXIMUM SQUADS
              </label>
              <input
                type="number"
                value={maxTeams}
                onChange={e => setMaxTeams(parseInt(e.target.value) || 50)}
                required
                min={1}
                className="cyber-input"
              />
            </div>

            <div>
              <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '8px' }}>
                HINT PENALTY TIME (SECONDS)
              </label>
              <input
                type="number"
                value={hintPenaltySeconds}
                onChange={e => setHintPenaltySeconds(parseInt(e.target.value) || 0)}
                required
                min={0}
                className="cyber-input"
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                e.g. 300s = 5 minutes added to team leaderboard time
              </div>
            </div>

            <div>
              <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '8px' }}>
                INCORRECT ANSWER PENALTY (SECONDS)
              </label>
              <input
                type="number"
                value={wrongAnswerPenaltySeconds}
                onChange={e => setWrongAnswerPenaltySeconds(parseInt(e.target.value) || 0)}
                required
                min={0}
                className="cyber-input"
              />
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '8px' }}>
              EVENT DESCRIPTION / MISSION BRIEFING
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="cyber-input"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '32px', marginTop: '24px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowHints}
                onChange={e => setAllowHints(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--neon-green)' }}
              />
              <span className="terminal" style={{ fontSize: '12px', color: '#fff' }}>
                ALLOW HINTS FOR SQUADS
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoCheckAnswers}
                onChange={e => setAutoCheckAnswers(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--neon-green)' }}
              />
              <span className="terminal" style={{ fontSize: '12px', color: '#fff' }}>
                AUTOMATIC ANSWER VERIFICATION (AUTO-DECRYPT)
              </span>
            </label>
          </div>
        </div>

        {/* Final Vault Settings */}
        <div className="glow-card" style={{ padding: '28px', borderLeft: '4px solid var(--purple-accent)' }}>
          <h2 className="terminal" style={{ fontSize: '16px', color: 'var(--purple-accent)', marginBottom: '16px', letterSpacing: '1px' }}>
            FINAL VAULT ACCESS PROTOCOL
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div>
              <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--purple-accent)', marginBottom: '8px' }}>
                MASTER VAULT KEY / PASSWORD
              </label>
              <input
                type="text"
                value={finalVaultPassword}
                onChange={e => setFinalVaultPassword(e.target.value)}
                placeholder="e.g. UXCLUB2026"
                className="cyber-input"
              />
            </div>

            <div>
              <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--purple-accent)', marginBottom: '8px' }}>
                FINAL VAULT CLUE / HINT
              </label>
              <input
                type="text"
                value={finalVaultHint}
                onChange={e => setFinalVaultHint(e.target.value)}
                placeholder="Clue provided to finalists"
                className="cyber-input"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ padding: '12px 32px', fontSize: '13px' }}
          >
            {saving ? 'UPDATING PROTOCOLS...' : 'SAVE MISSION CONFIGURATION'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div
        className="glow-card"
        style={{
          marginTop: '40px',
          padding: '24px',
          border: '1px solid rgba(239,68,68,0.4)',
          background: 'rgba(239,68,68,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 className="terminal" style={{ color: '#ef4444', fontSize: '14px', margin: '0 0 4px 0' }}>
              CRITICAL PURGE ZONE // HARD RESET
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0, maxWidth: '600px' }}>
              Purges all submissions, team progress records, hint logs, and score adjustments. Teams remain registered with score set to 0. Event returns to &apos;upcoming&apos;.
            </p>
          </div>

          <button
            onClick={handleResetEvent}
            disabled={actionLoading}
            className="terminal"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              padding: '12px 24px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            PURGE & RESET EVENT
          </button>
        </div>
      </div>
    </div>
  )
}
