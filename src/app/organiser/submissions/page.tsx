'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Submission, Team, Checkpoint, Challenge } from '@/types/database'

type SubmissionItem = Submission & {
  teams?: Team
  checkpoints?: Checkpoint
  challenges?: Challenge
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'pending'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchSubmissions()

    const supabase = createClient()
    const channel = supabase
      .channel('submissions-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        fetchSubmissions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchSubmissions() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('submissions')
      .select('*, teams(id, team_id, name, total_points), checkpoints(title, order_index), challenges(title, points, correct_answer)')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load transmission logs')
    } else if (data) {
      setSubmissions(data as any)
    }
    setLoading(false)
  }

  async function handleApprove(sub: SubmissionItem) {
    const supabase = createClient()
    const pointsToAward = sub.challenges?.points || 100

    try {
      // 1. Mark submission correct
      await supabase
        .from('submissions')
        .update({
          is_correct: true,
          points_after: (sub.teams?.total_points || 0) + pointsToAward,
        })
        .eq('id', sub.id)

      // 2. Award points to team
      if (sub.team_id) {
        await supabase
          .from('teams')
          .update({
            total_points: (sub.teams?.total_points || 0) + pointsToAward,
          })
          .eq('id', sub.team_id)
      }

      toast.success(`Submission approved for ${sub.teams?.name}! +${pointsToAward} pts`)
      fetchSubmissions()
    } catch {
      toast.error('Failed to approve submission')
    }
  }

  async function handleReject(sub: SubmissionItem) {
    const supabase = createClient()
    try {
      await supabase
        .from('submissions')
        .update({ is_correct: false })
        .eq('id', sub.id)

      toast.success(`Submission marked incorrect for ${sub.teams?.name}`)
      fetchSubmissions()
    } catch {
      toast.error('Failed to reject submission')
    }
  }

  const filtered = submissions.filter(s => {
    const matchesSearch =
      s.teams?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.teams?.team_id?.toLowerCase().includes(search.toLowerCase()) ||
      s.submitted_answer?.toLowerCase().includes(search.toLowerCase())

    if (filter === 'correct') return matchesSearch && s.is_correct === true
    if (filter === 'wrong') return matchesSearch && s.is_correct === false
    if (filter === 'pending') return matchesSearch && s.is_correct === null
    return matchesSearch
  })

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)', letterSpacing: '2px', marginBottom: '4px' }}>
          SURVEILLANCE ARCHIVE // TRANSMISSION AUDIT
        </div>
        <h1 className="terminal" style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: 0 }}>
          SUBMISSION LOGS & ANSWER APPROVAL
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
          Inspect all decoded packets submitted by squads and review answers when auto-check is manual
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div
        className="glow-card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px', maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search by squad, answer text, or checkpoint..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cyber-input"
            style={{ padding: '8px 14px', fontSize: '12px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(['all', 'correct', 'wrong', 'pending'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="terminal"
              style={{
                background: filter === f ? 'rgba(0,255,65,0.1)' : 'transparent',
                border: `1px solid ${filter === f ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)'}`,
                color: filter === f ? 'var(--neon-green)' : 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {f} ({submissions.filter(s => f === 'all' ? true : f === 'correct' ? s.is_correct === true : f === 'wrong' ? s.is_correct === false : s.is_correct === null).length})
            </button>
          ))}
        </div>
      </div>

      {/* Submissions Table */}
      <div className="glow-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <div className="terminal" style={{ color: 'var(--neon-green)', fontSize: '12px' }}>
              FETCHING TRANSMISSION PACKETS...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>∅</div>
            <div className="terminal">NO TRANSMISSIONS LOGGED MATCHING FILTERS</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>SQUAD</th>
                  <th>SECTOR / CHECKPOINT</th>
                  <th>CHALLENGE</th>
                  <th>SUBMITTED ANSWER</th>
                  <th>CORRECT ANSWER</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>OPERATIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => (
                  <tr key={sub.id}>
                    <td>
                      <span className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(sub.created_at).toLocaleTimeString()}
                      </span>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(sub.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge-blue" style={{ fontSize: '11px' }}>
                          {sub.teams?.team_id || 'UNKNOWN'}
                        </span>
                        <span style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>
                          {sub.teams?.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="terminal" style={{ fontSize: '12px', color: 'var(--electric-blue)' }}>
                        CP #{sub.checkpoints?.order_index || '?'}: {sub.checkpoints?.title}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#e2e8f0' }}>
                        {sub.challenges?.title || 'Challenge'}
                      </span>
                    </td>
                    <td>
                      <code
                        className="terminal"
                        style={{
                          background: 'rgba(0,0,0,0.5)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: `1px solid ${sub.is_correct ? 'rgba(0,255,65,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          color: sub.is_correct ? 'var(--neon-green)' : '#fca5a5',
                          fontSize: '12px',
                        }}
                      >
                        {sub.submitted_answer}
                      </code>
                    </td>
                    <td>
                      <code
                        className="terminal"
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          color: 'var(--text-muted)',
                          fontSize: '11px',
                        }}
                      >
                        {sub.challenges?.correct_answer || '—'}
                      </code>
                    </td>
                    <td>
                      {sub.is_correct === true && (
                        <span className="badge-green" style={{ fontSize: '11px', fontWeight: 700 }}>
                          ✓ DECRYPTED
                        </span>
                      )}
                      {sub.is_correct === false && (
                        <span className="badge-red" style={{ fontSize: '11px', fontWeight: 700 }}>
                          ✗ INCORRECT
                        </span>
                      )}
                      {sub.is_correct === null && (
                        <span className="badge-yellow" style={{ fontSize: '11px', fontWeight: 700 }}>
                          ⏳ PENDING REVIEW
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => handleApprove(sub)}
                          className="terminal"
                          style={{
                            background: 'rgba(0,255,65,0.1)',
                            border: '1px solid var(--neon-green)',
                            color: 'var(--neon-green)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                          title="Approve Answer"
                        >
                          APPROVE
                        </button>
                        <button
                          onClick={() => handleReject(sub)}
                          className="terminal"
                          style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid #ef4444',
                            color: '#ef4444',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                          title="Reject Answer"
                        >
                          REJECT
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
