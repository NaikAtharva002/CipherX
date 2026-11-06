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
    const { eventId } = await req.json()

    // Reset all teams
    await supabaseAdmin
      .from('teams')
      .update({
        total_points: 0,
        current_checkpoint_order: 0,
        total_penalties_seconds: 0,
        hints_used: 0,
        status: 'registered',
        started_at: null,
        completed_at: null,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000') // update all

    // Delete all progress, submissions, hints, adjustments
    await supabaseAdmin.from('team_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('hint_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('score_adjustments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('qr_scans').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Reset event status
    await supabaseAdmin
      .from('event_settings')
      .update({
        status: 'upcoming',
        start_time: null,
        end_time: null,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    return NextResponse.json({ success: true, message: 'Event reset successfully' })
  } catch (err) {
    console.error('reset-event error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  // Start event
  return NextResponse.json({ error: 'Use POST' }, { status: 405 })
}
