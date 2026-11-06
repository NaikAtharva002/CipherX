'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TeamModal from '@/components/organiser/TeamModal'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import type { Team, TeamMember, Checkpoint } from '@/types/database'

type TeamWithMembers = Team & {
  members?: TeamMember[]
}

export default function OrganiserTeamsPage() {
  const [teams, setTeams] = useState<TeamWithMembers[]>([])
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [teamToEdit, setTeamToEdit] = useState<TeamWithMembers | null>(null)
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState<TeamWithMembers | null>(null)

  // Score Adjustment Modal
  const [scoreTeam, setScoreTeam] = useState<Team | null>(null)
  const [adjType, setAdjType] = useState<'bonus' | 'penalty' | 'correction'>('bonus')
  const [adjPoints, setAdjPoints] = useState<number>(50)
  const [adjReason, setAdjReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    fetchTeamsData()
  }, [])

  async function fetchTeamsData() {
    setLoading(true)
    const supabase = createClient()

    // Fetch checkpoints for progress context
    const { data: cps } = await supabase.from('checkpoints').select('*').order('order_index', { ascending: true })
    if (cps) setCheckpoints(cps)

    // Fetch teams with members
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('*, team_members(*)')
      .order('total_points', { ascending: false })

    if (teamsError) {
      toast.error('Failed to load squads')
    } else if (teamsData) {
      setTeams(
        teamsData.map((t: any) => ({
          ...t,
          members: t.team_members || [],
        }))
      )
    }
    setLoading(false)
  }

  async function handleDeleteTeam(team: Team) {
    if (!confirm(`Are you sure you want to purge team "${team.name}" (${team.team_id})? All progress will be removed.`)) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('teams').delete().eq('id', team.id)
    if (error) {
      toast.error('Failed to delete team')
    } else {
      toast.success(`Team "${team.name}" purged`)
      fetchTeamsData()
    }
  }

  async function handleAdjustScore(e: React.FormEvent) {
    e.preventDefault()
    if (!scoreTeam) return
    if (!adjReason.trim()) {
      toast.error('Reason is mandatory for score adjustment audit log')
      return
    }

    setAdjusting(true)
    try {
      const delta = adjType === 'penalty' ? -Math.abs(adjPoints) : Math.abs(adjPoints)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const res = await fetch('/api/adjust-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: scoreTeam.id,
          adjustedBy: user?.id || '00000000-0000-0000-0000-000000000000',
          adjustmentType: adjType,
          pointsDelta: delta,
          reason: adjReason.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`Score adjusted for ${scoreTeam.name}! New points: ${data.newPoints}`)
        setScoreTeam(null)
        setAdjReason('')
        fetchTeamsData()
      } else {
        toast.error(data.error || 'Adjustment failed')
      }
    } catch {
      toast.error('Network error during score adjustment')
    } finally {
      setAdjusting(false)
    }
  }

  const filteredTeams = teams.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.team_id.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <div className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)', letterSpacing: '2px', marginBottom: '4px' }}>
            ORGANISER COMMAND // OPERATIVES & SQUADS
          </div>
          <h1 className="terminal" style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: 0 }}>
            TEAM DIRECTORY & SQUAD OPS
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Manage registered teams, squad credentials, progress overrides, and score adjustments
          </p>
        </div>

        <button
          onClick={() => {
            setTeamToEdit(null)
            setIsTeamModalOpen(true)
          }}
          className="btn-primary"
          style={{ padding: '12px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span>+</span> REGISTER NEW SQUAD
        </button>
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
            placeholder="Search by team name or ID code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cyber-input"
            style={{ padding: '8px 14px', fontSize: '12px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            STATUS:
          </span>
          {['all', 'registered', 'active', 'completed', 'disqualified'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className="terminal"
              style={{
                background: statusFilter === st ? 'rgba(0,255,65,0.1)' : 'transparent',
                border: `1px solid ${statusFilter === st ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)'}`,
                color: statusFilter === st ? 'var(--neon-green)' : 'var(--text-muted)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Teams Table */}
      <div className="glow-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <div className="terminal" style={{ color: 'var(--neon-green)', fontSize: '12px' }}>
              QUERYING SQUAD REGISTRY...
            </div>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>∅</div>
            <div className="terminal">NO SQUADS MATCHING QUERY CRITERIA</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>SQUAD ID</th>
                  <th>NAME & OPERATIVES</th>
                  <th>LOGIN KEY</th>
                  <th>STATUS</th>
                  <th>PROGRESS</th>
                  <th>SCORE</th>
                  <th>PENALTIES</th>
                  <th style={{ textAlign: 'right' }}>OPERATIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team, idx) => {
                  const totalCps = checkpoints.length || 1
                  const currentCp = team.current_checkpoint_order || 0
                  return (
                    <tr key={team.id}>
                      <td>
                        <span className="badge-blue" style={{ fontSize: '12px', fontWeight: 700 }}>
                          {team.team_id}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
                          {team.name}
                        </div>
                        <button
                          onClick={() => setSelectedTeamForMembers(team)}
                          className="terminal"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--electric-blue)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            padding: 0,
                            marginTop: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          👥 {team.members?.length || 0} Operatives (View Details)
                        </button>
                      </td>
                      <td>
                        <code
                          className="terminal"
                          style={{
                            background: 'rgba(0,0,0,0.5)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {team.password}
                        </code>
                      </td>
                      <td>
                        <span
                          className={`badge-${
                            team.status === 'completed'
                              ? 'purple'
                              : team.status === 'active'
                              ? 'green'
                              : team.status === 'disqualified'
                              ? 'red'
                              : 'yellow'
                          }`}
                          style={{ fontSize: '10px', textTransform: 'uppercase' }}
                        >
                          ● {team.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="terminal" style={{ fontSize: '11px', color: '#fff' }}>
                            CP {currentCp} / {totalCps}
                          </span>
                        </div>
                        <div className="progress-bar" style={{ height: '4px', width: '100px', marginTop: '4px' }}>
                          <div
                            className="progress-fill"
                            style={{ width: `${Math.min(100, Math.round((currentCp / totalCps) * 100))}%` }}
                          />
                        </div>
                      </td>
                      <td>
                        <span className="terminal" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--neon-green)' }}>
                          {team.total_points}
                        </span>
                      </td>
                      <td>
                        <span className="terminal" style={{ fontSize: '12px', color: team.total_penalties_seconds > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                          +{team.total_penalties_seconds}s
                        </span>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {team.hints_used} hints
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={() => setScoreTeam(team)}
                            className="terminal"
                            title="Adjust Score"
                            style={{
                              background: 'rgba(245,158,11,0.1)',
                              border: '1px solid #f59e0b',
                              color: '#f59e0b',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            ± SCORE
                          </button>
                          <button
                            onClick={() => {
                              setTeamToEdit(team)
                              setIsTeamModalOpen(true)
                            }}
                            className="terminal"
                            title="Edit Squad"
                            style={{
                              background: 'rgba(0,191,255,0.1)',
                              border: '1px solid var(--electric-blue)',
                              color: 'var(--electric-blue)',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team)}
                            className="terminal"
                            title="Delete Squad"
                            style={{
                              background: 'rgba(239,68,68,0.1)',
                              border: '1px solid #ef4444',
                              color: '#ef4444',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            DEL
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      {selectedTeamForMembers && (
        <Modal
          isOpen={!!selectedTeamForMembers}
          onClose={() => setSelectedTeamForMembers(null)}
          title={`OPERATIVES // ${selectedTeamForMembers.name} (${selectedTeamForMembers.team_id})`}
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedTeamForMembers.members && selectedTeamForMembers.members.length > 0 ? (
              selectedTeamForMembers.members.map(member => (
                <div
                  key={member.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
                      {member.name}
                    </div>
                    <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {member.email || 'No email registered'} {member.phone ? `• ${member.phone}` : ''}
                    </div>
                  </div>
                  <span
                    className={`badge-${member.role === 'leader' ? 'green' : 'blue'}`}
                    style={{ fontSize: '10px', textTransform: 'uppercase' }}
                  >
                    {member.role}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                No operatives registered in this squad.
              </div>
            )}

            <button
              onClick={() => setSelectedTeamForMembers(null)}
              className="btn-primary"
              style={{ marginTop: '12px', width: '100%', padding: '10px' }}
            >
              CLOSE
            </button>
          </div>
        </Modal>
      )}

      {/* Score Adjustment Modal */}
      {scoreTeam && (
        <Modal
          isOpen={!!scoreTeam}
          onClose={() => setScoreTeam(null)}
          title={`MANUAL SCORE OVERRIDE // ${scoreTeam.name}`}
          size="md"
        >
          <form onSubmit={handleAdjustScore} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px' }}>
              <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                CURRENT SQUAD SCORE:
              </div>
              <div className="terminal" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--neon-green)' }}>
                {scoreTeam.total_points} POINTS
              </div>
            </div>

            <div>
              <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '6px' }}>
                OVERRIDE TYPE
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['bonus', 'penalty', 'correction'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAdjType(type)}
                    className="terminal"
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '4px',
                      border: `1px solid ${adjType === type ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)'}`,
                      background: adjType === type ? 'rgba(0,255,65,0.1)' : 'transparent',
                      color: adjType === type ? 'var(--neon-green)' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '6px' }}>
                POINTS DELTA ({adjType === 'penalty' ? 'Deducted' : 'Awarded'})
              </label>
              <input
                type="number"
                value={adjPoints}
                onChange={e => setAdjPoints(Math.max(1, parseInt(e.target.value) || 0))}
                required
                min={1}
                className="cyber-input"
              />
            </div>

            <div>
              <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '6px' }}>
                AUDIT REASON (Mandatory Log)
              </label>
              <input
                type="text"
                placeholder="e.g. Fair play bonus / Hardware glitch compensation"
                value={adjReason}
                onChange={e => setAdjReason(e.target.value)}
                required
                className="cyber-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setScoreTeam(null)}
                className="terminal"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'var(--text-muted)',
                  padding: '10px 18px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={adjusting}
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '11px' }}
              >
                {adjusting ? 'APPLYING...' : 'CONFIRM OVERRIDE'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create / Edit Team Modal */}
      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSaved={fetchTeamsData}
        teamToEdit={teamToEdit}
      />
    </div>
  )
}
