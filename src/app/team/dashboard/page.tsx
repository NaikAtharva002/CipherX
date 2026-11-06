'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import type { Team, Checkpoint, Challenge, TeamMember, EventSettings, TeamProgress } from '@/types/database'

interface TeamSession {
  teamId: string
  teamCode: string
  teamName: string
  expiresAt: number
}

export default function TeamDashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState<TeamSession | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [eventSettings, setEventSettings] = useState<EventSettings | null>(null)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [currentCheckpoint, setCurrentCheckpoint] = useState<Checkpoint | null>(null)
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null)
  const [progressList, setProgressList] = useState<TeamProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [answerInput, setAnswerInput] = useState('')
  const [timeLeft, setTimeLeft] = useState('--:--:--')

  // Hint Modal State
  const [hintModalOpen, setHintModalOpen] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)
  const [revealedHint, setRevealedHint] = useState<string | null>(null)

  // Success Celebration Modal
  const [solvedModalOpen, setSolvedModalOpen] = useState(false)
  const [solvedData, setSolvedData] = useState<{ points: number; isFinal: boolean } | null>(null)

  // Completed History Toggle
  const [historyOpen, setHistoryOpen] = useState(false)

  const fetchMissionData = useCallback(async (teamId: string) => {
    const supabase = createClient()

    // 1. Fetch team
    const { data: teamData } = await supabase.from('teams').select('*').eq('id', teamId).single()
    if (teamData) setTeam(teamData)

    // 2. Fetch members
    const { data: membersData } = await supabase.from('team_members').select('*').eq('team_id', teamId)
    if (membersData) setMembers(membersData)

    // 3. Fetch event settings
    const { data: settingsData } = await supabase.from('event_settings').select('*').single()
    if (settingsData) setEventSettings(settingsData)

    // 4. Fetch all active checkpoints
    const { data: cpData } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
    if (cpData) setCheckpoints(cpData)

    // 5. Fetch team progress
    const { data: progData } = await supabase.from('team_progress').select('*').eq('team_id', teamId)
    if (progData) setProgressList(progData)

    // 6. Determine current active checkpoint
    if (cpData && cpData.length > 0 && teamData) {
      const activeCpIndex = teamData.current_checkpoint_order + 1
      const activeCp = cpData.find(c => c.order_index === activeCpIndex) || cpData[cpData.length - 1]
      setCurrentCheckpoint(activeCp)

      // Fetch challenge for this checkpoint
      if (activeCp) {
        const { data: challengeData } = await supabase
          .from('challenges')
          .select('id, checkpoint_id, title, description, challenge_type, multiple_choice_options, difficulty, time_limit_seconds, points, wrong_answer_penalty, hint_penalty, image_url, audio_url, created_at, updated_at')
          .eq('checkpoint_id', activeCp.id)
          .maybeSingle()

        if (challengeData) {
          setCurrentChallenge(challengeData as Challenge)
        }
      }
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('cipherx_team_session')
    if (!raw) {
      router.replace('/team/login')
      return
    }

    try {
      const parsed: TeamSession = JSON.parse(raw)
      setSession(parsed)
      fetchMissionData(parsed.teamId)

      // Real-time listener for progress updates
      const supabase = createClient()
      const channel = supabase
        .channel(`team-${parsed.teamId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `id=eq.${parsed.teamId}` }, () => {
          fetchMissionData(parsed.teamId)
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'event_settings' }, () => {
          fetchMissionData(parsed.teamId)
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch {
      router.replace('/team/login')
    }
  }, [router, fetchMissionData])

  // Mission countdown clock
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

  async function handleSubmitAnswer(e: React.FormEvent) {
    e.preventDefault()
    if (!session || !currentChallenge || !currentCheckpoint) return
    if (!answerInput.trim()) {
      toast.error('Enter an answer before transmitting')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: session.teamId,
          challengeId: currentChallenge.id,
          checkpointId: currentCheckpoint.id,
          answer: answerInput.trim(),
        }),
      })

      const data = await res.json()
      if (data.correct) {
        toast.success(`DECRYPTION CONFIRMED! +${data.points} PTS`, { duration: 4000 })
        setSolvedData({ points: data.points, isFinal: data.isFinal })
        setSolvedModalOpen(true)
        setAnswerInput('')
        setRevealedHint(null)
        fetchMissionData(session.teamId)
      } else {
        toast.error(data.message || 'Decryption failed! Penalty logged.')
        fetchMissionData(session.teamId)
      }
    } catch {
      toast.error('Transmission failure. Check terminal connection.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestHint() {
    if (!session || !currentChallenge || !currentCheckpoint) return

    setHintLoading(true)
    try {
      const res = await fetch('/api/request-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: session.teamId,
          challengeId: currentChallenge.id,
          checkpointId: currentCheckpoint.id,
        }),
      })

      const data = await res.json()
      if (data.hint) {
        setRevealedHint(data.hint)
        toast.success(data.alreadyRequested ? 'Hint retrieved!' : `Hint revealed! Penalty applied.`)
        fetchMissionData(session.teamId)
      } else {
        toast.error(data.error || 'Hint unavailable')
      }
    } catch {
      toast.error('Hint network error')
    } finally {
      setHintLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div className="terminal" style={{ color: 'var(--neon-green)', fontSize: '13px', letterSpacing: '2px' }}>
            ESTABLISHING MISSION CIPHER FEED...
          </div>
        </div>
      </div>
    )
  }

  const isCompleted = team?.status === 'completed'
  const isEventNotStarted = eventSettings?.status === 'upcoming'
  const totalCps = checkpoints.length || 5
  const currentOrder = team?.current_checkpoint_order || 0
  const progressPercent = Math.min(100, Math.round((currentOrder / totalCps) * 100))

  return (
    <div style={{ padding: '24px 16px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Squad Header Banner */}
      <div
        className="glow-card"
        style={{
          padding: '24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(10,10,15,0.98) 100%)',
          borderLeft: '4px solid var(--neon-green)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="badge-blue" style={{ fontSize: '11px', fontWeight: 700 }}>
              SQUAD: {session?.teamCode}
            </span>
            <span
              className={`badge-${
                team?.status === 'completed' ? 'purple' : team?.status === 'active' ? 'green' : 'yellow'
              }`}
              style={{ fontSize: '11px', textTransform: 'uppercase' }}
            >
              ● {team?.status}
            </span>
          </div>

          <h1
            className="terminal"
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#fff',
              margin: '0 0 6px 0',
              letterSpacing: '1px',
            }}
          >
            {team?.name}
          </h1>

          {/* Members line */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              OPERATIVES:
            </span>
            {members.map(m => (
              <span
                key={m.id}
                style={{
                  fontSize: '11px',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  color: m.role === 'leader' ? 'var(--neon-green)' : '#cbd5e1',
                }}
              >
                {m.name} {m.role === 'leader' ? '★' : ''}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Mission Clock & QR Scan Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="terminal" style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
              MISSION CLOCK
            </div>
            <div className="countdown-digit" style={{ fontSize: '32px' }}>
              {timeLeft}
            </div>
          </div>

          <Link
            href="/team/scan"
            className="btn-primary"
            style={{
              padding: '12px 20px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              background: 'rgba(0,255,65,0.1)',
            }}
          >
            <span>📷</span> SCAN QR CODE
          </Link>
        </div>
      </div>

      {/* Progress Radar Tracker */}
      <div className="glow-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="terminal" style={{ fontSize: '12px', color: 'var(--neon-green)', letterSpacing: '1px' }}>
              MISSION SECTOR PROGRESSION
            </span>
          </div>
          <span className="terminal" style={{ fontSize: '12px', color: '#fff' }}>
            SECTOR {currentOrder} / {totalCps} ({progressPercent}%)
          </span>
        </div>

        {/* Visual Nodes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', margin: '20px 0' }}>
          {/* Connecting line */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '20px',
              right: '20px',
              height: '2px',
              background: 'rgba(255,255,255,0.1)',
              zIndex: 1,
              transform: 'translateY(-50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '20px',
              width: `${(currentOrder / (totalCps - 1 || 1)) * 95}%`,
              height: '2px',
              background: 'linear-gradient(90deg, var(--neon-green), var(--electric-blue))',
              zIndex: 2,
              transform: 'translateY(-50%)',
              transition: 'width 0.5s ease',
            }}
          />

          {checkpoints.map((cp, idx) => {
            const isDone = currentOrder >= cp.order_index
            const isCurrent = currentOrder + 1 === cp.order_index && !isCompleted
            return (
              <div
                key={cp.id}
                style={{
                  position: 'relative',
                  zIndex: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isDone
                      ? 'var(--neon-green)'
                      : isCurrent
                      ? '#0a0a0f'
                      : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${
                      isDone
                        ? 'var(--neon-green)'
                        : isCurrent
                        ? 'var(--electric-blue)'
                        : 'rgba(255,255,255,0.2)'
                    }`,
                    color: isDone ? '#000' : isCurrent ? 'var(--electric-blue)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '12px',
                    boxShadow: isCurrent
                      ? '0 0 15px var(--electric-blue)'
                      : isDone
                      ? '0 0 10px rgba(0,255,65,0.4)'
                      : 'none',
                  }}
                >
                  {isDone ? '✓' : cp.order_index}
                </div>
                <div
                  className="terminal"
                  style={{
                    fontSize: '10px',
                    marginTop: '6px',
                    color: isCurrent ? 'var(--electric-blue)' : isDone ? 'var(--neon-green)' : 'var(--text-muted)',
                    maxWidth: '80px',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {cp.title}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Grid: Challenge Arena & Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Left Column: Mission Challenge Terminal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {isCompleted ? (
            /* Completed Banner */
            <div
              className="glow-card"
              style={{
                padding: '40px',
                textAlign: 'center',
                background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, rgba(10,10,15,0.95) 100%)',
                border: '2px solid var(--purple-accent)',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
              <h2 className="terminal glitch-text" data-text="MISSION ACCOMPLISHED" style={{ fontSize: '28px', color: '#fff', marginBottom: '8px' }}>
                MISSION ACCOMPLISHED
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 20px' }}>
                Your squad has successfully breached all checkpoints and unlocked the final vault. Check the live leaderboard for final standings!
              </p>
              <Link
                href="/leaderboard"
                className="btn-primary"
                style={{ display: 'inline-block', padding: '12px 28px', textDecoration: 'none' }}
              >
                VIEW LIVE LEADERBOARD
              </Link>
            </div>
          ) : isEventNotStarted ? (
            /* Upcoming Event Screen */
            <div className="glow-card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
              <h2 className="terminal" style={{ fontSize: '22px', color: 'var(--neon-green)', marginBottom: '8px' }}>
                AWAITING MISSION BRIEFING...
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '420px', margin: '0 auto' }}>
                The mission is standing by. Stand at your initial assembly sector. The first checkpoint clue will unlock automatically when organisers initiate the event clock.
              </p>
            </div>
          ) : currentChallenge ? (
            /* Active Challenge Card */
            <div
              className="glow-card"
              style={{
                padding: '28px',
                borderTop: '3px solid var(--neon-green)',
                position: 'relative',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className="badge-blue" style={{ fontSize: '10px' }}>
                      SECTOR #{currentCheckpoint?.order_index || 1}
                    </span>
                    <span className="badge-yellow" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                      {currentChallenge.difficulty}
                    </span>
                    <span className="badge-green" style={{ fontSize: '10px' }}>
                      {currentChallenge.points} PTS
                    </span>
                  </div>
                  <h2 className="terminal" style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {currentChallenge.title}
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {eventSettings?.allow_hints && (
                    <button
                      type="button"
                      onClick={() => setHintModalOpen(true)}
                      className="terminal"
                      style={{
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid #f59e0b',
                        color: '#f59e0b',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>💡</span> {revealedHint ? 'VIEW HINT' : 'REQUEST HINT'}
                    </button>
                  )}
                </div>
              </div>

              {/* Physical Location Clue if any */}
              {currentCheckpoint?.location && (
                <div
                  style={{
                    background: 'rgba(0,191,255,0.06)',
                    border: '1px solid rgba(0,191,255,0.2)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>📍</span>
                  <div>
                    <span className="terminal" style={{ color: 'var(--electric-blue)', fontWeight: 600 }}>
                      LOCATION TELEMETRY:
                    </span>{' '}
                    <span style={{ color: '#e2e8f0' }}>{currentCheckpoint.location}</span>
                  </div>
                </div>
              )}

              {/* Challenge Body Adaptor by Type */}
              <div
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: "'JetBrains Mono', monospace" }}>
                  &gt; MISSION DATA PAYLOAD [{currentChallenge.challenge_type.toUpperCase()}]:
                </div>

                {/* Challenge description rendering */}
                <div
                  className="terminal"
                  style={{
                    fontSize: '14px',
                    color: '#e2e8f0',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {currentChallenge.description}
                </div>

                {/* Image attachment if provided */}
                {currentChallenge.image_url && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <img
                      src={currentChallenge.image_url}
                      alt="Clue Transmission"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        borderRadius: '6px',
                        border: '1px solid rgba(0,255,65,0.3)',
                      }}
                    />
                  </div>
                )}

                {/* Audio attachment if provided */}
                {currentChallenge.audio_url && (
                  <div style={{ marginTop: '16px' }}>
                    <audio controls style={{ width: '100%' }}>
                      <source src={currentChallenge.audio_url} />
                      Audio not supported
                    </audio>
                  </div>
                )}

                {/* Multiple choice options if enabled */}
                {Array.isArray(currentChallenge.multiple_choice_options) &&
                  (currentChallenge.multiple_choice_options as string[]).some(Boolean) && (
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="terminal" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        SELECT FREQUENCY / OPTION:
                      </div>
                      {(currentChallenge.multiple_choice_options as string[]).filter(Boolean).map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAnswerInput(opt)}
                          className="terminal"
                          style={{
                            textAlign: 'left',
                            padding: '10px 14px',
                            background: answerInput === opt ? 'rgba(0,255,65,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${answerInput === opt ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)'}`,
                            color: answerInput === opt ? 'var(--neon-green)' : '#cbd5e1',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          [{String.fromCharCode(65 + i)}] {opt}
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              {/* Revealed Hint Box if already unlocked */}
              {revealedHint && (
                <div
                  style={{
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                  }}
                >
                  <div className="terminal" style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>
                    💡 INTEL DECRYPTED:
                  </div>
                  <div style={{ fontSize: '13px', color: '#fef3c7' }}>{revealedHint}</div>
                </div>
              )}

              {/* Answer Submission Form */}
              <form onSubmit={handleSubmitAnswer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="terminal" style={{ display: 'block', fontSize: '11px', color: 'var(--neon-green)', marginBottom: '8px' }}>
                    SUBMIT DECRYPTION KEY / ANSWER
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={answerInput}
                      onChange={e => setAnswerInput(e.target.value)}
                      placeholder="Type decoded answer..."
                      required
                      className="cyber-input"
                      style={{ fontSize: '14px', letterSpacing: '1px' }}
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary"
                      style={{
                        padding: '0 24px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {submitting ? (
                        <>
                          <div className="spinner" style={{ width: '14px', height: '14px' }} />
                          TRANSMITTING...
                        </>
                      ) : (
                        'TRANSMIT →'
                      )}
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: "'JetBrains Mono', monospace" }}>
                    Penalty for false transmission: -{eventSettings?.wrong_answer_penalty_seconds || 60}s time penalty
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="glow-card" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Scan the sector QR code to engage the next puzzle.
              </p>
              <Link href="/team/scan" className="btn-primary" style={{ display: 'inline-block', marginTop: '12px', textDecoration: 'none' }}>
                OPEN QR SCANNER
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Squad Scorecard & Completed Sectors History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Squad Metrics Card */}
          <div className="glow-card" style={{ padding: '24px' }}>
            <h3 className="terminal" style={{ fontSize: '14px', color: 'var(--neon-green)', marginBottom: '16px', letterSpacing: '1px' }}>
              SQUAD TELEMETRY & SCORE
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="terminal" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  TOTAL POINTS
                </div>
                <div className="terminal" style={{ fontSize: '26px', fontWeight: 900, color: 'var(--neon-green)', marginTop: '4px' }}>
                  {team?.total_points || 0}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="terminal" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  ACCUMULATED PENALTIES
                </div>
                <div className="terminal" style={{ fontSize: '26px', fontWeight: 900, color: (team?.total_penalties_seconds || 0) > 0 ? '#ef4444' : 'var(--text-muted)', marginTop: '4px' }}>
                  +{(team?.total_penalties_seconds || 0)}s
                </div>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div>Hints Claimed: <span style={{ color: '#fff' }}>{team?.hints_used || 0}</span></div>
              <div style={{ marginTop: '4px' }}>Active Sector: <span style={{ color: 'var(--electric-blue)' }}>{currentCheckpoint?.title || 'Sector 1'}</span></div>
            </div>
          </div>

          {/* Completed Checkpoints History */}
          <div className="glow-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="terminal" style={{ fontSize: '14px', color: 'var(--electric-blue)', margin: 0, letterSpacing: '1px' }}>
                COMPLETED ARCHIVES ({currentOrder})
              </h3>
              <button
                type="button"
                onClick={() => setHistoryOpen(!historyOpen)}
                className="terminal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                {historyOpen ? 'COLLAPSE ▲' : 'EXPAND ▼'}
              </button>
            </div>

            {currentOrder === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                No sectors decrypted yet. Solve your current challenge to unlock clues.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {checkpoints.slice(0, currentOrder).map(cp => (
                  <div
                    key={cp.id}
                    style={{
                      background: 'rgba(0,255,65,0.03)',
                      border: '1px solid rgba(0,255,65,0.15)',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>
                        CP #{cp.order_index}: {cp.title}
                      </div>
                      {historyOpen && cp.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Clue: {cp.description}
                        </div>
                      )}
                    </div>
                    <span className="badge-green" style={{ fontSize: '10px' }}>
                      ✓ DECRYPTED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hint Confirmation Modal */}
      <Modal
        isOpen={hintModalOpen}
        onClose={() => setHintModalOpen(false)}
        title="TACTICAL INTEL REQUEST"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px' }}>
            <div className="terminal" style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, marginBottom: '6px' }}>
              ⚠ PENALTY WARNING PROTOCOL
            </div>
            <p style={{ fontSize: '13px', color: '#fef3c7', margin: 0 }}>
              Requesting a mission hint will add an automatic{' '}
              <strong>+{eventSettings?.hint_penalty_seconds || 300} seconds</strong> penalty to your squad&apos;s leaderboard time.
            </p>
          </div>

          {revealedHint ? (
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.5)', borderRadius: '6px' }}>
              <div className="terminal" style={{ fontSize: '11px', color: 'var(--neon-green)', marginBottom: '6px' }}>
                CURRENT UNLOCKED HINT:
              </div>
              <div style={{ fontSize: '14px', color: '#fff' }}>{revealedHint}</div>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Are you sure you want to deduct penalty time to receive tactical guidance?
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setHintModalOpen(false)}
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
              CLOSE
            </button>
            {!revealedHint && (
              <button
                type="button"
                onClick={handleRequestHint}
                disabled={hintLoading}
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '11px' }}
              >
                {hintLoading ? 'DECRYPTING HINT...' : 'CONFIRM & UNLOCK HINT'}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Solved Celebration Modal */}
      <Modal
        isOpen={solvedModalOpen}
        onClose={() => setSolvedModalOpen(false)}
        title={solvedData?.isFinal ? 'VAULT BREACHED!' : 'DECRYPTION SUCCESSFUL'}
        size="md"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {solvedData?.isFinal ? '👑' : '⚡'}
          </div>
          <h3 className="terminal" style={{ fontSize: '24px', color: 'var(--neon-green)', marginBottom: '8px' }}>
            {solvedData?.isFinal ? 'FINAL VAULT UNLOCKED!' : 'SECTOR CLEARED!'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            {solvedData?.isFinal
              ? 'Congratulations! Your squad has breached the ultimate cipher and completed the treasure hunt!'
              : `Your transmission was verified. +${solvedData?.points} points credited to your squad score.`}
          </p>

          <button
            type="button"
            onClick={() => setSolvedModalOpen(false)}
            className="btn-primary"
            style={{ padding: '12px 32px' }}
          >
            {solvedData?.isFinal ? 'VIEW FINAL STANDINGS' : 'PROCEED TO NEXT SECTOR →'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
