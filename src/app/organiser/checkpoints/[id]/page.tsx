'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import type { Checkpoint, Challenge } from '@/types/database'

const CHALLENGE_TYPES = [
  'binary', 'morse', 'caesar', 'qr_puzzle', 'debug_code', 'logic',
  'image_clue', 'audio_clue', 'pattern', 'password', 'human_server',
  'human_sort', 'black_box', 'beat_bot', 'defuse', 'hotspot',
  'fake_qr', 'duck_debug', 'broken_qr', 'final_vault', 'custom',
]

const emptyChallenge = {
  title: '',
  description: '',
  challenge_type: 'logic',
  correct_answer: '',
  answer_case_sensitive: false,
  multiple_choice_enabled: false,
  multiple_choice_options: ['', '', '', ''] as string[],
  hint: '',
  difficulty: 'medium' as 'easy' | 'medium' | 'hard' | 'extreme',
  time_limit_seconds: 300,
  points: 100,
  wrong_answer_penalty: 10,
  hint_penalty: 20,
  image_url: '',
  audio_url: '',
}

export default function CheckpointDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const [form, setForm] = useState(emptyChallenge)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [qrOrigin, setQrOrigin] = useState('https://cipherx.vercel.app')

  useEffect(() => {
    if (typeof window !== 'undefined') setQrOrigin(window.location.origin)
  }, [])

  const fetchData = useCallback(async () => {
    const [cpRes, chRes] = await Promise.all([
      supabase.from('checkpoints').select('*').eq('id', id).single(),
      supabase.from('challenges').select('*').eq('checkpoint_id', id).order('created_at'),
    ])
    if (cpRes.error) { toast.error('Checkpoint not found'); router.push('/organiser/checkpoints'); return }
    setCheckpoint(cpRes.data)
    setChallenges(chRes.data || [])
    setLoading(false)
  }, [id, supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditingChallenge(null)
    setForm(emptyChallenge)
    setModalOpen(true)
  }

  const openEdit = (ch: Challenge) => {
    setEditingChallenge(ch)
    const opts = Array.isArray(ch.multiple_choice_options)
      ? [...(ch.multiple_choice_options as string[]), '', '', '', ''].slice(0, 4)
      : ['', '', '', '']
    setForm({
      title: ch.title,
      description: ch.description,
      challenge_type: ch.challenge_type,
      correct_answer: ch.correct_answer,
      answer_case_sensitive: ch.answer_case_sensitive,
      multiple_choice_enabled: Array.isArray(ch.multiple_choice_options) && (ch.multiple_choice_options as string[]).some(Boolean),
      multiple_choice_options: opts,
      hint: ch.hint || '',
      difficulty: ch.difficulty,
      time_limit_seconds: ch.time_limit_seconds,
      points: ch.points,
      wrong_answer_penalty: ch.wrong_answer_penalty,
      hint_penalty: ch.hint_penalty,
      image_url: ch.image_url || '',
      audio_url: ch.audio_url || '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.correct_answer.trim()) { toast.error('Correct answer is required'); return }
    setSaving(true)

    const payload = {
      checkpoint_id: id,
      title: form.title.trim(),
      description: form.description.trim(),
      challenge_type: form.challenge_type,
      correct_answer: form.correct_answer.trim(),
      answer_case_sensitive: form.answer_case_sensitive,
      multiple_choice_options: form.multiple_choice_enabled
        ? form.multiple_choice_options.filter(Boolean)
        : null,
      hint: form.hint.trim() || null,
      difficulty: form.difficulty,
      time_limit_seconds: form.time_limit_seconds,
      points: form.points,
      wrong_answer_penalty: form.wrong_answer_penalty,
      hint_penalty: form.hint_penalty,
      image_url: form.image_url.trim() || null,
      audio_url: form.audio_url.trim() || null,
    }

    if (editingChallenge) {
      const { error } = await supabase.from('challenges').update(payload).eq('id', editingChallenge.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Challenge updated!')
    } else {
      const { error } = await supabase.from('challenges').insert(payload)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Challenge created!')
    }

    setSaving(false)
    setModalOpen(false)
    fetchData()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('challenges').delete().eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    toast.success('Challenge deleted')
    setConfirmDeleteOpen(false)
    setDeleteId(null)
    fetchData()
  }

  const downloadQR = () => {
    if (!checkpoint) return
    const svg = document.getElementById('cp-qr-svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400; canvas.height = 400
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 400, 400)
      ctx.drawImage(img, 0, 0, 400, 400)
      const a = document.createElement('a')
      a.download = `qr-${checkpoint.title.replace(/\s+/g, '-')}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const difficultyColor: Record<string, string> = {
    easy: '#10b981', medium: '#f59e0b', hard: '#ef4444', extreme: '#8b5cf6'
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  }

  if (!checkpoint) return null

  const qrValue = `${qrOrigin}/scan/${checkpoint.qr_code_token}`

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <button onClick={() => router.push('/organiser/checkpoints')} className="terminal text-xs text-slate-400 hover:text-green-400 mb-6 flex items-center gap-1">
        ← BACK TO CHECKPOINTS
      </button>

      {/* Checkpoint Info + QR */}
      <div className="glow-card p-6 mb-6 flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="terminal neon-green text-2xl font-bold">{checkpoint.title}</h1>
            {checkpoint.is_final && <span className="badge-yellow">FINAL</span>}
            <span className={checkpoint.is_active ? 'badge-green' : 'badge-red'}>
              {checkpoint.is_active ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <span className="badge-blue">ORDER #{checkpoint.order_index}</span>
          </div>
          {checkpoint.location && <p className="terminal text-slate-400 text-sm mb-1">📍 {checkpoint.location}</p>}
          {checkpoint.description && <p className="text-slate-400 text-sm mb-3">{checkpoint.description}</p>}
          <div className="terminal text-xs text-slate-600">
            <span>QR Token: </span>
            <span className="text-slate-400 break-all">{checkpoint.qr_code_token}</span>
          </div>
        </div>

        {/* QR Section */}
        <div className="flex flex-col items-center gap-3">
          <div style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
            <QRCodeSVG
              id="cp-qr-svg"
              value={qrValue}
              size={160}
            />
          </div>
          <p className="terminal text-xs text-slate-500 text-center max-w-[200px] break-all">{qrValue}</p>
          <button onClick={downloadQR} className="btn-primary terminal text-xs px-4 py-2 rounded w-full">
            ⬇ DOWNLOAD PNG
          </button>
        </div>
      </div>

      {/* Challenges */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="terminal neon-blue font-semibold tracking-wider">CHALLENGES ({challenges.length})</h2>
        <button onClick={openCreate} className="btn-primary terminal text-xs px-4 py-2">
          + ADD CHALLENGE
        </button>
      </div>

      {challenges.length === 0 ? (
        <div className="glow-card p-10 text-center">
          <div className="text-4xl mb-3">🧩</div>
          <p className="terminal text-slate-400 text-sm">No challenges yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((ch) => (
            <div key={ch.id} className="glow-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-white">{ch.title}</span>
                    <span className="badge-blue terminal">{ch.challenge_type}</span>
                    <span className="terminal text-xs font-bold" style={{ color: difficultyColor[ch.difficulty] }}>
                      {ch.difficulty.toUpperCase()}
                    </span>
                    <span className="badge-green">{ch.points} pts</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1 line-clamp-2">{ch.description}</p>
                  <div className="flex flex-wrap gap-4 mt-2 terminal text-xs text-slate-500">
                    <span>⏱ {ch.time_limit_seconds}s</span>
                    <span>✗ -{ch.wrong_answer_penalty}pts</span>
                    <span>💡 -{ch.hint_penalty}pts</span>
                    {ch.answer_case_sensitive && <span className="text-yellow-500">CASE SENSITIVE</span>}
                    {Array.isArray(ch.multiple_choice_options) && (ch.multiple_choice_options as string[]).length > 0 && (
                      <span className="text-blue-400">MULTIPLE CHOICE</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(ch)}
                    className="text-xs terminal px-3 py-1.5 rounded"
                    style={{ border: '1px solid rgba(0,191,255,0.4)', color: 'var(--electric-blue)' }}
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => { setDeleteId(ch.id); setConfirmDeleteOpen(true) }}
                    className="text-xs terminal px-3 py-1.5 rounded"
                    style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                  >
                    DEL
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Challenge Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingChallenge ? 'EDIT CHALLENGE' : 'ADD CHALLENGE'}
        size="xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Title *</label>
              <input className="cyber-input rounded" placeholder="Challenge title" value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Description</label>
              <textarea className="cyber-input rounded resize-none" rows={4} placeholder="Describe the challenge..."
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Challenge Type */}
            <div>
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Challenge Type</label>
              <select className="cyber-input rounded" value={form.challenge_type}
                onChange={(e) => setForm((f) => ({ ...f, challenge_type: e.target.value }))}>
                {CHALLENGE_TYPES.map((t) => (
                  <option key={t} value={t} style={{ background: '#111827' }}>{t}</option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Difficulty</label>
              <select className="cyber-input rounded" value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as typeof form.difficulty }))}>
                {['easy', 'medium', 'hard', 'extreme'].map((d) => (
                  <option key={d} value={d} style={{ background: '#111827' }}>{d}</option>
                ))}
              </select>
            </div>

            {/* Correct Answer */}
            <div className="md:col-span-2">
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Correct Answer *</label>
              <input className="cyber-input rounded" placeholder="The correct answer"
                value={form.correct_answer} onChange={(e) => setForm((f) => ({ ...f, correct_answer: e.target.value }))} />
            </div>

            {/* Case Sensitive */}
            <div className="flex items-center gap-3 p-3 rounded" style={{ background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.1)' }}>
              <button onClick={() => setForm((f) => ({ ...f, answer_case_sensitive: !f.answer_case_sensitive }))}
                className={`w-10 h-5 rounded-full transition-all relative ${form.answer_case_sensitive ? 'bg-green-500' : 'bg-slate-700'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.answer_case_sensitive ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className="terminal text-sm text-slate-300">Case Sensitive Answer</span>
            </div>

            {/* Multiple Choice */}
            <div className="flex items-center gap-3 p-3 rounded" style={{ background: 'rgba(0,191,255,0.05)', border: '1px solid rgba(0,191,255,0.1)' }}>
              <button onClick={() => setForm((f) => ({ ...f, multiple_choice_enabled: !f.multiple_choice_enabled }))}
                className={`w-10 h-5 rounded-full transition-all relative ${form.multiple_choice_enabled ? 'bg-blue-500' : 'bg-slate-700'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.multiple_choice_enabled ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className="terminal text-sm text-slate-300">Multiple Choice</span>
            </div>

            {/* MC Options */}
            {form.multiple_choice_enabled && (
              <div className="md:col-span-2 space-y-2">
                <label className="terminal text-xs text-slate-400 uppercase tracking-wider block">Options (up to 4)</label>
                {form.multiple_choice_options.map((opt, i) => (
                  <input key={i} className="cyber-input rounded" placeholder={`Option ${i + 1}`}
                    value={opt} onChange={(e) => {
                      const opts = [...form.multiple_choice_options]
                      opts[i] = e.target.value
                      setForm((f) => ({ ...f, multiple_choice_options: opts }))
                    }} />
                ))}
              </div>
            )}

            {/* Hint */}
            <div className="md:col-span-2">
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Hint Text</label>
              <input className="cyber-input rounded" placeholder="Optional hint for participants"
                value={form.hint} onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))} />
            </div>

            {/* Time Limit */}
            <div className="md:col-span-2">
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">
                Time Limit: <span className="neon-green">{form.time_limit_seconds}s</span>
              </label>
              <input type="range" min={60} max={3600} step={60} value={form.time_limit_seconds}
                onChange={(e) => setForm((f) => ({ ...f, time_limit_seconds: parseInt(e.target.value) }))}
                className="w-full accent-green-400" />
              <div className="flex justify-between terminal text-xs text-slate-500 mt-1">
                <span>60s</span><span>3600s</span>
              </div>
            </div>

            {/* Points */}
            <div>
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Points</label>
              <input type="number" min={0} className="cyber-input rounded" value={form.points}
                onChange={(e) => setForm((f) => ({ ...f, points: parseInt(e.target.value) || 0 }))} />
            </div>

            {/* Wrong Answer Penalty */}
            <div>
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Wrong Answer Penalty (pts)</label>
              <input type="number" min={0} className="cyber-input rounded" value={form.wrong_answer_penalty}
                onChange={(e) => setForm((f) => ({ ...f, wrong_answer_penalty: parseInt(e.target.value) || 0 }))} />
            </div>

            {/* Hint Penalty */}
            <div>
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Hint Penalty (pts)</label>
              <input type="number" min={0} className="cyber-input rounded" value={form.hint_penalty}
                onChange={(e) => setForm((f) => ({ ...f, hint_penalty: parseInt(e.target.value) || 0 }))} />
            </div>

            {/* Image URL */}
            <div>
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Image URL</label>
              <input className="cyber-input rounded" placeholder="https://..." value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
            </div>

            {/* Audio URL */}
            <div className="md:col-span-2">
              <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Audio URL</label>
              <input className="cyber-input rounded" placeholder="https://..." value={form.audio_url}
                onChange={(e) => setForm((f) => ({ ...f, audio_url: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 terminal text-sm py-2.5 rounded text-slate-400" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              CANCEL
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary terminal text-sm py-2.5 rounded">
              {saving ? 'SAVING…' : editingChallenge ? 'UPDATE' : 'CREATE'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <Modal isOpen={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} title="CONFIRM DELETE" size="sm">
        <div className="space-y-4">
          <p className="text-slate-300">Are you sure you want to delete this challenge?</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDeleteOpen(false)} className="flex-1 terminal text-sm py-2.5 rounded text-slate-400" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>CANCEL</button>
            <button onClick={handleDelete} className="flex-1 terminal text-sm py-2.5 rounded" style={{ border: '1px solid rgba(239,68,68,0.5)', color: '#ef4444' }}>DELETE</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
