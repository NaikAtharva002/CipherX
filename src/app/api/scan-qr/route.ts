import '@/lib/dns-patch'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const { qrToken, teamId } = await req.json()

    if (!qrToken || !teamId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Fetch checkpoint by QR token
    const { data: checkpoint, error: cpError } = await supabaseAdmin
      .from('checkpoints')
      .select('*')
      .eq('qr_code_token', qrToken)
      .single()

    if (cpError || !checkpoint) {
      await supabaseAdmin.from('qr_scans').insert({
        team_id: teamId,
        checkpoint_id: '00000000-0000-0000-0000-000000000000',
        qr_token: qrToken,
        is_valid: false,
        error_reason: 'Invalid QR token',
      })
      return NextResponse.json({ error: 'Invalid QR code', valid: false }, { status: 404 })
    }

    if (!checkpoint.is_active) {
      return NextResponse.json({ error: 'Checkpoint is not active', valid: false }, { status: 403 })
    }

    // Fetch team
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found', valid: false }, { status: 404 })
    }

    // Check if team has unlocked this checkpoint
    const { data: progress } = await supabaseAdmin
      .from('team_progress')
      .select('*')
      .eq('team_id', teamId)
      .eq('checkpoint_id', checkpoint.id)
      .maybeSingle()

    // Log the scan
    await supabaseAdmin.from('qr_scans').insert({
      team_id: teamId,
      checkpoint_id: checkpoint.id,
      qr_token: qrToken,
      is_valid: true,
      error_reason: null,
    })

    if (!progress || progress.status === 'locked') {
      return NextResponse.json({
        valid: false,
        error: 'CHECKPOINT LOCKED',
        message: `You haven't unlocked checkpoint ${checkpoint.order_index} yet. Complete previous checkpoints first.`,
        checkpoint: { title: checkpoint.title, order: checkpoint.order_index },
      }, { status: 403 })
    }

    if (progress.status === 'completed') {
      return NextResponse.json({
        valid: true,
        alreadyCompleted: true,
        message: 'You have already completed this checkpoint!',
        checkpoint,
        pointsEarned: progress.points_earned,
      })
    }

    // Update progress to scanning
    await supabaseAdmin
      .from('team_progress')
      .update({
        status: 'solving',
        scanned_at: new Date().toISOString(),
        started_solving_at: new Date().toISOString(),
      })
      .eq('id', progress.id)

    return NextResponse.json({
      valid: true,
      alreadyCompleted: false,
      checkpoint,
      message: 'Checkpoint verified! Challenge unlocked.',
    })
  } catch (err) {
    console.error('scan-qr error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
