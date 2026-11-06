'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Member {
  name: string
  role: 'leader' | 'member'
  email: string
}

const defaultMember = (): Member => ({ name: '', role: 'member', email: '' })

function generateTeamId() {
  const digits = Math.floor(Math.random() * 900 + 100)
  return `TEAM${digits}`
}

export default function TeamRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [teamName, setTeamName] = useState('')
  const [teamId, setTeamId] = useState(generateTeamId())
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [members, setMembers] = useState<Member[]>([{ name: '', role: 'leader', email: '' }])

  const [createdCreds, setCreatedCreds] = useState<{ teamId: string; password: string } | null>(null)

  function addMember() {
    if (members.length < 5) setMembers(prev => [...prev, defaultMember()])
  }

  function removeMember(index: number) {
    setMembers(prev => prev.filter((_, i) => i !== index))
  }

  function updateMember(index: number, field: keyof Member, value: string) {
    setMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }
    if (!members.some(m => m.role === 'leader')) {
      setError('At least one member must have the Leader role.')
      return
    }
    const validMembers = members.filter(m => m.name.trim())
    if (validMembers.length === 0) {
      setError('Add at least one team member.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const normalizedId = teamId.trim().toUpperCase()

      // Check ID uniqueness
      const { data: existing } = await supabase
        .from('teams')
        .select('id')
        .eq('team_id', normalizedId)
        .maybeSingle()

      if (existing) {
        setError(`Team ID "${normalizedId}" is already taken. Please choose another.`)
        setLoading(false)
        return
      }

      // Insert team
      const { data: newTeam, error: insertError } = await supabase
        .from('teams')
        .insert({
          team_id: normalizedId,
          name: teamName.trim(),
          password: password,
          current_checkpoint_order: 0,
          total_points: 0,
          total_penalties_seconds: 0,
          hints_used: 0,
          status: 'registered',
        })
        .select('id')
        .single()

      if (insertError || !newTeam) {
        setError('Failed to create team. Please try again.')
        setLoading(false)
        return
      }

      // Insert members
      const memberInserts = validMembers.map(m => ({
        team_id: newTeam.id,
        name: m.name.trim(),
        role: m.role,
        email: m.email.trim() || null,
        phone: null,
      }))

      const { error: membersError } = await supabase
        .from('team_members')
        .insert(memberInserts)

      if (membersError) {
        setError('Team created but failed to add members. Please contact support.')
        setLoading(false)
        return
      }

      setCreatedCreds({ teamId: normalizedId, password })
      setStep('success')
    } catch (err) {
      console.error(err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen grid-bg scanlines flex items-center justify-center p-4">
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div className="glow-card" style={{ padding: '40px', textAlign: 'center' }}>
            {/* Success icon */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 24px',
              background: 'rgba(0,255,65,0.1)',
              border: '2px solid var(--neon-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px',
              boxShadow: '0 0 30px rgba(0,255,65,0.3)'
            }}>
              ✓
            </div>

            <div className="neon-green terminal" style={{ fontSize: '11px', letterSpacing: '3px', marginBottom: '8px' }}>
              REGISTRATION COMPLETE
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '24px' }}>
              Team Created Successfully
            </h2>

            {/* Credentials box */}
            <div style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(0,255,65,0.3)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <div className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)', letterSpacing: '2px', marginBottom: '12px' }}>
                ⚠ SAVE YOUR CREDENTIALS — SHOWN ONCE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Team ID</span>
                  <span className="terminal" style={{ fontSize: '16px', color: 'var(--neon-green)', fontWeight: 700 }}>
                    {createdCreds?.teamId}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Password</span>
                  <span className="terminal" style={{ fontSize: '16px', color: 'var(--electric-blue)', fontWeight: 700 }}>
                    {createdCreds?.password}
                  </span>
                </div>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => router.push('/team/login')}
              style={{ width: '100%', borderRadius: '6px', padding: '12px', letterSpacing: '2px' }}
            >
              &gt; GO TO LOGIN
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid-bg scanlines py-8 px-4">
      <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 className="terminal" style={{
            fontSize: '36px', fontWeight: 900, color: 'var(--neon-green)',
            textShadow: '0 0 20px rgba(0,255,65,0.6)', letterSpacing: '6px'
          }}>
            CIPHERX
          </h1>
          <div className="terminal" style={{ fontSize: '12px', color: 'var(--electric-blue)', marginTop: '4px', letterSpacing: '2px' }}>
            NEW TEAM REGISTRATION
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Team Info Card */}
          <div className="glow-card" style={{ padding: '24px' }}>
            <div className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)', letterSpacing: '2px', marginBottom: '20px' }}>
              01 / TEAM INFORMATION
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Team Name */}
              <div>
                <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>
                  TEAM NAME
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  placeholder="e.g. The Cryptic Coders"
                  required
                  className="cyber-input"
                  style={{ borderRadius: '6px' }}
                />
              </div>

              {/* Team ID */}
              <div>
                <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>
                  TEAM ID <span style={{ color: 'var(--electric-blue)' }}>(auto-generated, editable)</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={teamId}
                    onChange={e => setTeamId(e.target.value.toUpperCase())}
                    required
                    className="cyber-input"
                    style={{ borderRadius: '6px', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setTeamId(generateTeamId())}
                    className="btn-primary"
                    style={{ borderRadius: '6px', padding: '10px 16px', flexShrink: 0, fontSize: '12px' }}
                  >
                    ↻
                  </button>
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 4 characters"
                    required
                    className="cyber-input"
                    style={{ borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px' }}>
                    CONFIRM
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="cyber-input"
                    style={{
                      borderRadius: '6px',
                      borderColor: confirmPassword && confirmPassword !== password
                        ? 'rgba(239,68,68,0.5)' : undefined
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Members Card */}
          <div className="glow-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)', letterSpacing: '2px' }}>
                02 / TEAM MEMBERS <span style={{ color: 'var(--text-muted)' }}>({members.length}/5)</span>
              </div>
              {members.length < 5 && (
                <button
                  type="button"
                  onClick={addMember}
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px' }}
                >
                  + ADD MEMBER
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {members.map((member, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(0,255,65,0.1)',
                    borderRadius: '8px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="terminal" style={{ fontSize: '11px', color: 'var(--electric-blue)', letterSpacing: '1px' }}>
                      MEMBER {String(i + 1).padStart(2, '0')}
                    </span>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMember(i)}
                        style={{
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444', borderRadius: '4px', padding: '2px 8px',
                          cursor: 'pointer', fontSize: '11px'
                        }}
                      >
                        ✕ REMOVE
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="terminal" style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        NAME *
                      </label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={e => updateMember(i, 'name', e.target.value)}
                        placeholder="Full name"
                        required={i === 0}
                        className="cyber-input"
                        style={{ borderRadius: '4px', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label className="terminal" style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        ROLE *
                      </label>
                      <select
                        value={member.role}
                        onChange={e => updateMember(i, 'role', e.target.value as 'leader' | 'member')}
                        className="cyber-input"
                        style={{ borderRadius: '4px', fontSize: '13px' }}
                      >
                        <option value="leader">Leader</option>
                        <option value="member">Member</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="terminal" style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        EMAIL (OPTIONAL)
                      </label>
                      <input
                        type="email"
                        value={member.email}
                        onChange={e => updateMember(i, 'email', e.target.value)}
                        placeholder="member@example.com"
                        className="cyber-input"
                        style={{ borderRadius: '4px', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '6px', padding: '12px 16px',
              display: 'flex', gap: '10px', alignItems: 'flex-start'
            }}>
              <span style={{ color: '#ef4444' }}>✖</span>
              <span className="terminal" style={{ fontSize: '13px', color: '#ef4444' }}>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%', borderRadius: '6px', padding: '14px',
              fontSize: '14px', letterSpacing: '2px',
              opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
            }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: '16px', height: '16px' }} /> REGISTERING TEAM...</>
            ) : (
              '&gt; REGISTER TEAM'
            )}
          </button>

          {/* Back to login */}
          <div style={{ textAlign: 'center', paddingBottom: '24px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Already registered? </span>
            <Link href="/team/login" style={{ color: 'var(--electric-blue)', fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", textDecoration: 'none', borderBottom: '1px solid rgba(0,191,255,0.3)' }}>
              Login →
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
