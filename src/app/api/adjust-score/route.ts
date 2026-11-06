import '@/lib/dns-patch'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/config'

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const { teamId, adjustedBy, adjustmentType, pointsDelta, reason } = await req.json()

    if (!teamId || !adjustedBy || !adjustmentType || pointsDelta === undefined || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get current team points
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('total_points')
      .eq('id', teamId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Apply adjustment
    await supabaseAdmin
      .from('teams')
      .update({ total_points: Math.max(0, team.total_points + pointsDelta) })
      .eq('id', teamId)

    // Log adjustment
    await supabaseAdmin.from('score_adjustments').insert({
      team_id: teamId,
      adjusted_by: adjustedBy,
      adjustment_type: adjustmentType,
      points_delta: pointsDelta,
      reason,
    })

    return NextResponse.json({ success: true, newPoints: Math.max(0, team.total_points + pointsDelta) })
  } catch (err) {
    console.error('adjust-score error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
