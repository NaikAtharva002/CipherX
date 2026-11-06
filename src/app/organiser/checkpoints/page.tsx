'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import type { Checkpoint } from '@/types/database'

interface CheckpointWithChallengeCount extends Checkpoint {
  challenge_count?: number
}

const emptyForm = {
  title: '',
  location: '',
  description: '',
  order_index: 1,
  is_final: false,
}

export default function CheckpointsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [checkpoints, setCheckpoints] = useState<CheckpointWithChallengeCount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [activeQr, setActiveQr] = useState<Checkpoint | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const fetchCheckpoints = useCallback(async () => {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('*')
      .order('order_index', { ascending: true })

    if (error) { toast.error('Failed to load checkpoints'); return }

    // fetch challenge counts
    const counts = await Promise.all(
      (data || []).map(async (cp) => {
        const { count } = await supabase
          .from('challenges')
          .select('*', { count: 'exact', head: true })
          .eq('checkpoint_id', cp.id)
        return { id: cp.id, count: count ?? 0 }
      })
    )
    const countMap = Object.fromEntries(counts.map((c) => [c.id, c.count]))
    setCheckpoints((data || []).map((cp) => ({ ...cp, challenge_count: countMap[cp.id] ?? 0 })))
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchCheckpoints() }, [fetchCheckpoints])

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    const qr_code_token = crypto.randomUUID()
    const { data, error } = await supabase
      .from('checkpoints')
      .insert({
        title: form.title.trim(),
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        order_index: form.order_index,
        is_final: form.is_final,
        qr_code_token,
        is_active: true,
      })
      .select()
      .single()

    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Checkpoint created!')
    setModalOpen(false)
    setForm(emptyForm)
    router.push(`/organiser/checkpoints/${data.id}`)
  }

  const toggleActive = async (cp: Checkpoint) => {
    const { error } = await supabase
      .from('checkpoints')
      .update({ is_active: !cp.is_active })
      .eq('id', cp.id)
    if (error) { toast.error(error.message); return }
    toast.success(`Checkpoint ${!cp.is_active ? 'activated' : 'deactivated'}`)
    fetchCheckpoints()
  }

  const moveOrder = async (cp: Checkpoint, direction: 'up' | 'down') => {
    const idx = checkpoints.findIndex((c) => c.id === cp.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= checkpoints.length) return
    const swap = checkpoints[swapIdx]
    const updates = [
      supabase.from('checkpoints').update({ order_index: swap.order_index }).eq('id', cp.id),
      supabase.from('checkpoints').update({ order_index: cp.order_index }).eq('id', swap.id),
    ]
    await Promise.all(updates)
    fetchCheckpoints()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('checkpoints').delete().eq('id', deleteId)
    if (error) { toast.error(error.message); return }
    toast.success('Checkpoint deleted')
    setConfirmDeleteOpen(false)
    setDeleteId(null)
    fetchCheckpoints()
  }

  const downloadQR = (cp: Checkpoint) => {
    const svg = document.getElementById(`qr-svg-${cp.id}`)
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 300; canvas.height = 300
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 300, 300)
      ctx.drawImage(img, 0, 0, 300, 300)
      const a = document.createElement('a')
      a.download = `qr-${cp.title.replace(/\s+/g, '-')}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="terminal neon-green text-2xl font-bold tracking-wider">CHECKPOINTS</h1>
          <p className="text-slate-400 text-sm mt-1 terminal">{checkpoints.length} checkpoints configured</p>
        </div>
        <button
          className="btn-primary terminal text-sm px-5 py-2.5"
          onClick={() => { setForm(emptyForm); setModalOpen(true) }}
        >
          + ADD CHECKPOINT
        </button>
      </div>

      {/* Checkpoint List */}
      {checkpoints.length === 0 ? (
        <div className="glow-card p-12 text-center">
          <div className="text-5xl mb-4">📍</div>
          <p className="terminal text-slate-400">No checkpoints yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {checkpoints.map((cp, idx) => (
            <div key={cp.id} className="glow-card p-4 flex items-start gap-4">
              {/* Order badge */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <button
                  onClick={() => moveOrder(cp, 'up')}
                  disabled={idx === 0}
                  className="text-slate-500 hover:text-green-400 disabled:opacity-20 transition-colors text-xs"
                  title="Move up"
                >▲</button>
                <div
                  className="w-10 h-10 rounded flex items-center justify-center terminal font-bold text-sm"
                  style={{ background: 'rgba(0,255,65,0.1)', color: 'var(--neon-green)', border: '1px solid rgba(0,255,65,0.3)' }}
                >
                  #{cp.order_index}
                </div>
                <button
                  onClick={() => moveOrder(cp, 'down')}
                  disabled={idx === checkpoints.length - 1}
                  className="text-slate-500 hover:text-green-400 disabled:opacity-20 transition-colors text-xs"
                  title="Move down"
                >▼</button>
              </div>

              {/* QR Code Preview */}
              <div
                className="cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                onClick={() => { setActiveQr(cp); setQrModalOpen(true) }}
                title="Click to view full QR"
              >
                <div style={{ background: '#fff', padding: 4, borderRadius: 4 }}>
                  <div id={`qr-svg-${cp.id}`} style={{ display: 'none' }}>
                    <QRCodeSVG
                      value={`https://cipherx.vercel.app/scan/${cp.qr_code_token}`}
                      size={200}
                    />
                  </div>
                  <QRCodeSVG
                    value={`https://cipherx.vercel.app/scan/${cp.qr_code_token}`}
                    size={56}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{cp.title}</span>
                  {cp.is_final && <span className="badge-yellow">FINAL</span>}
                  <span className={cp.is_active ? 'badge-green' : 'badge-red'}>
                    {cp.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span className="badge-blue">{cp.challenge_count} challenge{cp.challenge_count !== 1 ? 's' : ''}</span>
                </div>
                {cp.location && (
                  <p className="text-slate-400 text-xs mt-1 terminal">📍 {cp.location}</p>
                )}
                {cp.description && (
                  <p className="text-slate-500 text-xs mt-1 truncate">{cp.description}</p>
                )}
                <p className="text-slate-600 text-xs mt-1 terminal">token: {cp.qr_code_token.slice(0, 20)}…</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(cp)}
                  className="text-xs terminal px-3 py-1.5 rounded transition-colors"
                  style={{
                    border: `1px solid ${cp.is_active ? 'rgba(239,68,68,0.4)' : 'rgba(0,255,65,0.4)'}`,
                    color: cp.is_active ? '#ef4444' : 'var(--neon-green)',
                  }}
                >
                  {cp.is_active ? 'DISABLE' : 'ENABLE'}
                </button>
                <button
                  onClick={() => router.push(`/organiser/checkpoints/${cp.id}`)}
                  className="text-xs terminal px-3 py-1.5 rounded transition-colors"
                  style={{ border: '1px solid rgba(0,191,255,0.4)', color: 'var(--electric-blue)' }}
                >
                  EDIT
                </button>
                <button
                  onClick={() => { setDeleteId(cp.id); setConfirmDeleteOpen(true) }}
                  className="text-xs terminal px-3 py-1.5 rounded transition-colors"
                  style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                >
                  DEL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="ADD CHECKPOINT" size="md">
        <div className="space-y-4">
          <div>
            <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Title *</label>
            <input
              className="cyber-input rounded"
              placeholder="e.g. Cipher Gate Alpha"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Location</label>
            <input
              className="cyber-input rounded"
              placeholder="e.g. Lab 3, Block B"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div>
            <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Description</label>
            <textarea
              className="cyber-input rounded resize-none"
              rows={3}
              placeholder="Brief description of this checkpoint..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="terminal text-xs text-slate-400 uppercase tracking-wider block mb-1">Order Index</label>
            <input
              type="number"
              min={1}
              className="cyber-input rounded"
              value={form.order_index}
              onChange={(e) => setForm((f) => ({ ...f, order_index: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="flex items-center gap-3 p-3 rounded" style={{ background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.1)' }}>
            <button
              onClick={() => setForm((f) => ({ ...f, is_final: !f.is_final }))}
              className={`w-10 h-5 rounded-full transition-all relative ${form.is_final ? 'bg-yellow-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.is_final ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="terminal text-sm text-slate-300">Is Final Checkpoint</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 terminal text-sm py-2.5 rounded text-slate-400" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              CANCEL
            </button>
            <button onClick={handleCreate} disabled={saving} className="flex-1 btn-primary terminal text-sm py-2.5 rounded">
              {saving ? 'CREATING…' : 'CREATE & EDIT'}
            </button>
          </div>
        </div>
      </Modal>

      {/* QR Full Modal */}
      <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} title="QR CODE" size="sm">
        {activeQr && (
          <div className="flex flex-col items-center gap-4">
            <p className="terminal neon-green text-sm">{activeQr.title}</p>
            <div style={{ background: '#ffffff', padding: 16, borderRadius: 8 }}>
              <QRCodeSVG
                id={`qr-modal-${activeQr.id}`}
                value={`https://cipherx.vercel.app/scan/${activeQr.qr_code_token}`}
                size={200}
              />
            </div>
            <p className="terminal text-xs text-slate-500 text-center break-all">
              {`https://cipherx.vercel.app/scan/${activeQr.qr_code_token}`}
            </p>
            <button
              onClick={() => downloadQR(activeQr)}
              className="btn-primary terminal text-sm px-6 py-2.5 rounded w-full"
            >
              ⬇ DOWNLOAD PNG
            </button>
          </div>
        )}
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal isOpen={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} title="CONFIRM DELETE" size="sm">
        <div className="space-y-4">
          <p className="text-slate-300">Are you sure you want to delete this checkpoint? All associated challenges and progress will also be deleted.</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDeleteOpen(false)} className="flex-1 terminal text-sm py-2.5 rounded text-slate-400" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              CANCEL
            </button>
            <button onClick={handleDelete} className="flex-1 terminal text-sm py-2.5 rounded" style={{ border: '1px solid rgba(239,68,68,0.5)', color: '#ef4444' }}>
              DELETE
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
