'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Team, TeamMember } from '@/types/database'

interface MemberInput {
  id?: string
  name: string
  role: string
  email: string
  phone: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  teamToEdit?: (Team & { members?: TeamMember[] }) | null
}

function generateRandomTeamId() {
  const digits = Math.floor(Math.random() * 900 + 100)
  return `TEAM${digits}`
}

export default function TeamModal({ isOpen, onClose, onSaved, teamToEdit }: Props) {
  const [teamId, setTeamId] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'registered' | 'active' | 'completed' | 'disqualified'>('registered')
  const [members, setMembers] = useState<MemberInput[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (teamToEdit) {
      setTeamId(teamToEdit.team_id)
      setName(teamToEdit.name)
      setPassword(teamToEdit.password)
      setStatus(teamToEdit.status)
      if (teamToEdit.members && teamToEdit.members.length > 0) {
        setMembers(
          teamToEdit.members.map(m => ({
            id: m.id,
            name: m.name,
            role: m.role,
            email: m.email || '',
            phone: m.phone || '',
          }))
        )
      } else {
        setMembers([{ name: '', role: 'leader', email: '', phone: '' }])
      }
    } else {
      setTeamId(generateRandomTeamId())
      setName('')
      setPassword(Math.random().toString(36).slice(-8))
      setStatus('registered')
      setMembers([
        { name: '', role: 'leader', email: '', phone: '' },
        { name: '', role: 'member', email: '', phone: '' },
      ])
    }
  }, [teamToEdit, isOpen])

  const addMember = () => {
    if (members.length < 6) {
      setMembers(prev => [...prev, { name: '', role: 'member', email: '', phone: '' }])
    } else {
      toast.error('Maximum 6 members allowed per team')
    }
  }

  const removeMember = (index: number) => {
    setMembers(prev => prev.filter((_, i) => i !== index))
  }

  const updateMember = (index: number, field: keyof MemberInput, value: string) => {
    setMembers(prev =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Team name is required')
      return
    }
    if (!teamId.trim()) {
      toast.error('Team ID is required')
      return
    }
    if (!password.trim()) {
      toast.error('Password is required')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (teamToEdit) {
        // Update existing team
        const { error: teamError } = await supabase
          .from('teams')
          .update({
            name: name.trim(),
            team_id: teamId.trim().toUpperCase(),
            password: password.trim(),
            status,
          })
          .eq('id', teamToEdit.id)

        if (teamError) throw teamError

        // Sync members: delete old and re-insert
        await supabase.from('team_members').delete().eq('team_id', teamToEdit.id)

        const validMembers = members.filter(m => m.name.trim())
        if (validMembers.length > 0) {
          const { error: memberError } = await supabase.from('team_members').insert(
            validMembers.map(m => ({
              team_id: teamToEdit.id,
              name: m.name.trim(),
              role: m.role || 'member',
              email: m.email.trim() || null,
              phone: m.phone.trim() || null,
            }))
          )
          if (memberError) throw memberError
        }

        toast.success(`Team "${name}" updated successfully`)
      } else {
        // Insert new team
        const { data: insertedTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: name.trim(),
            team_id: teamId.trim().toUpperCase(),
            password: password.trim(),
            status,
            total_points: 0,
            total_penalties_seconds: 0,
            hints_used: 0,
            current_checkpoint_order: 0,
          })
          .select()
          .single()

        if (teamError) throw teamError

        const validMembers = members.filter(m => m.name.trim())
        if (validMembers.length > 0 && insertedTeam) {
          const { error: memberError } = await supabase.from('team_members').insert(
            validMembers.map(m => ({
              team_id: insertedTeam.id,
              name: m.name.trim(),
              role: m.role || 'member',
              email: m.email.trim() || null,
              phone: m.phone.trim() || null,
            }))
          )
          if (memberError) throw memberError
        }

        toast.success(`Team "${name}" registered with ID: ${teamId.toUpperCase()}`)
      }

      onSaved()
      onClose()
    } catch (err: unknown) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Failed to save team')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={teamToEdit ? `EDIT TEAM: ${teamToEdit.team_id}` : 'REGISTER NEW SQUAD'}
      size="lg"
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '6px' }}>
              TEAM NAME *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Cyber Strikers"
              required
              className="cyber-input"
            />
          </div>

          <div>
            <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '6px' }}>
              TEAM ID CODE *
            </label>
            <input
              type="text"
              value={teamId}
              onChange={e => setTeamId(e.target.value.toUpperCase())}
              placeholder="e.g. TEAM001"
              required
              className="cyber-input"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div>
            <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '6px' }}>
              ACCESS PASSWORD *
            </label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password for team login"
              required
              className="cyber-input"
            />
          </div>

          <div>
            <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '6px' }}>
              INITIAL STATUS
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="cyber-input"
              style={{ background: '#0a0a0f' }}
            >
              <option value="registered">Registered</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="disqualified">Disqualified</option>
            </select>
          </div>
        </div>

        {/* Squad Members */}
        <div style={{ borderTop: '1px solid rgba(0,255,65,0.15)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="terminal" style={{ fontSize: '12px', color: 'var(--electric-blue)', letterSpacing: '1px' }}>
              SQUAD OPERATIVES ({members.length})
            </span>
            <button
              type="button"
              onClick={addMember}
              className="terminal"
              style={{
                background: 'rgba(0,191,255,0.1)',
                border: '1px solid var(--electric-blue)',
                color: 'var(--electric-blue)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              + ADD OPERATIVE
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {members.map((member, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr 1.2fr 36px',
                  gap: '8px',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <input
                  type="text"
                  placeholder="Operative Name"
                  value={member.name}
                  onChange={e => updateMember(index, 'name', e.target.value)}
                  className="cyber-input"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                />
                <select
                  value={member.role}
                  onChange={e => updateMember(index, 'role', e.target.value)}
                  className="cyber-input"
                  style={{ padding: '6px 10px', fontSize: '12px', background: '#0a0a0f' }}
                >
                  <option value="leader">Team Leader</option>
                  <option value="member">Operative</option>
                </select>
                <input
                  type="email"
                  placeholder="Email"
                  value={member.email}
                  onChange={e => updateMember(index, 'email', e.target.value)}
                  className="cyber-input"
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                />
                <button
                  type="button"
                  onClick={() => removeMember(index)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Remove operative"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            className="terminal"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'var(--text-muted)',
              padding: '10px 20px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{
              padding: '10px 24px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {saving ? (
              <>
                <div className="spinner" style={{ width: '14px', height: '14px' }} />
                SAVING...
              </>
            ) : (
              'SAVE SQUAD DATA'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
