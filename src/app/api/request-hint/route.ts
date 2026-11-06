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
    const { teamId, challengeId, checkpointId } = await req.json()

    if (!teamId || !challengeId || !checkpointId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if hint already given
    const { data: existingHint } = await supabaseAdmin
      .from('hint_requests')
      .select('id, hint_text')
      .eq('team_id', teamId)
      .eq('challenge_id', challengeId)
      .maybeSingle()

    if (existingHint) {
      return NextResponse.json({
        hint: existingHint.hint_text,
        penaltySeconds: 0,
        alreadyRequested: true,
      })
    }

    // Fetch challenge hint
    const { data: challenge } = await supabaseAdmin
      .from('challenges')
      .select('hint, hint_penalty')
      .eq('id', challengeId)
      .single()

    if (!challenge || !challenge.hint) {
      return NextResponse.json({ error: 'No hint available' }, { status: 404 })
    }

    // Fetch event settings for hint penalty
    const { data: eventSettings } = await supabaseAdmin
      .from('event_settings')
      .select('hint_penalty_seconds, allow_hints')
      .single()

    if (!eventSettings?.allow_hints) {
      return NextResponse.json({ error: 'Hints are disabled for this event' }, { status: 403 })
    }

    const penaltySeconds = eventSettings.hint_penalty_seconds || 300

    // Apply penalty to team
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('total_penalties_seconds, hints_used')
      .eq('id', teamId)
      .single()

    if (team) {
      await supabaseAdmin
        .from('teams')
        .update({
          total_penalties_seconds: team.total_penalties_seconds + penaltySeconds,
          hints_used: team.hints_used + 1,
        })
        .eq('id', teamId)
    }

    // Record hint request
    await supabaseAdmin.from('hint_requests').insert({
      team_id: teamId,
      challenge_id: challengeId,
      checkpoint_id: checkpointId,
      hint_text: challenge.hint,
      penalty_seconds: penaltySeconds,
    })

    return NextResponse.json({
      hint: challenge.hint,
      penaltySeconds,
      alreadyRequested: false,
    })
  } catch (err) {
    console.error('request-hint error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
