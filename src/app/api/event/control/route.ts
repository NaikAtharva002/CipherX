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
    const { action, durationMinutes } = await req.json()

    const { data: event } = await supabaseAdmin
      .from('event_settings')
      .select('*')
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (action === 'start') {
      const startTime = new Date()
      const endTime = new Date(startTime.getTime() + (durationMinutes || event.duration_minutes) * 60 * 1000)

      await supabaseAdmin
        .from('event_settings')
        .update({ status: 'active', start_time: startTime.toISOString(), end_time: endTime.toISOString() })
        .eq('id', event.id)

      // Set all registered teams to active, set started_at
      await supabaseAdmin
        .from('teams')
        .update({ status: 'active', started_at: startTime.toISOString() })
        .eq('status', 'registered')

      // Unlock first checkpoint for all active teams
      const { data: firstCheckpoint } = await supabaseAdmin
        .from('checkpoints')
        .select('id')
        .eq('order_index', 1)
        .eq('is_active', true)
        .single()

      if (firstCheckpoint) {
        const { data: teams } = await supabaseAdmin
          .from('teams')
          .select('id')
          .eq('status', 'active')

        if (teams) {
          const progressRecords = teams.map(t => ({
            team_id: t.id,
            checkpoint_id: firstCheckpoint.id,
            status: 'unlocked',
          }))

          await supabaseAdmin
            .from('team_progress')
            .upsert(progressRecords, { onConflict: 'team_id,checkpoint_id' })
        }
      }

      return NextResponse.json({ success: true, action: 'started', startTime, endTime })
    }

    if (action === 'pause') {
      await supabaseAdmin
        .from('event_settings')
        .update({ status: 'paused' })
        .eq('id', event.id)
      return NextResponse.json({ success: true, action: 'paused' })
    }

    if (action === 'resume') {
      await supabaseAdmin
        .from('event_settings')
        .update({ status: 'active' })
        .eq('id', event.id)
      return NextResponse.json({ success: true, action: 'resumed' })
    }

    if (action === 'end') {
      await supabaseAdmin
        .from('event_settings')
        .update({ status: 'ended', end_time: new Date().toISOString() })
        .eq('id', event.id)

      // Mark all active teams as completed
      await supabaseAdmin
        .from('teams')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('status', 'active')

      return NextResponse.json({ success: true, action: 'ended' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('event-control error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
