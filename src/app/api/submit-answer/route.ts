import '@/lib/dns-patch'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/config'

// Use anon key for read (relies on RLS being loose for submissions)
// In production, use service role key stored in SUPABASE_SERVICE_ROLE_KEY env
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const { teamId, challengeId, checkpointId, answer } = await req.json()

    if (!teamId || !challengeId || !checkpointId || answer === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Fetch challenge (server-side, never exposed to client)
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // 2. Fetch team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // 3. Fetch event settings for penalty values
    const { data: eventSettings } = await supabaseAdmin
      .from('event_settings')
      .select('*')
      .single()

    // 4. Check for duplicate correct submission
    const { data: existingCorrect } = await supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('team_id', teamId)
      .eq('challenge_id', challengeId)
      .eq('is_correct', true)
      .maybeSingle()

    if (existingCorrect) {
      return NextResponse.json({
        error: 'Already solved',
        message: 'You have already correctly answered this challenge.'
      }, { status: 409 })
    }

    // 5. Compare answers
    const submittedAnswer = challenge.answer_case_sensitive
      ? answer.trim()
      : answer.trim().toLowerCase()
    const correctAnswer = challenge.answer_case_sensitive
      ? challenge.correct_answer.trim()
      : challenge.correct_answer.trim().toLowerCase()

    const isCorrect = submittedAnswer === correctAnswer

    // 6. Record submission
    await supabaseAdmin.from('submissions').insert({
      team_id: teamId,
      challenge_id: challengeId,
      checkpoint_id: checkpointId,
      submitted_answer: answer,
      is_correct: isCorrect,
      points_before: team.total_points,
      points_after: isCorrect ? team.total_points + challenge.points : team.total_points,
      penalty_applied: isCorrect ? 0 : (eventSettings?.wrong_answer_penalty_seconds || 60),
    })

    if (isCorrect) {
      // 7a. Update team_progress to completed
      await supabaseAdmin
        .from('team_progress')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          points_earned: challenge.points,
        })
        .eq('team_id', teamId)
        .eq('checkpoint_id', checkpointId)

      // 7b. Update team total points + checkpoint order
      const { data: checkpoint } = await supabaseAdmin
        .from('checkpoints')
        .select('order_index, is_final')
        .eq('id', checkpointId)
        .single()

      await supabaseAdmin
        .from('teams')
        .update({
          total_points: team.total_points + challenge.points,
          current_checkpoint_order: checkpoint ? checkpoint.order_index : team.current_checkpoint_order,
          status: checkpoint?.is_final ? 'completed' : 'active',
          completed_at: checkpoint?.is_final ? new Date().toISOString() : null,
        })
        .eq('id', teamId)

      // 7c. If not final, unlock next checkpoint
      let nextCheckpoint = null
      if (!checkpoint?.is_final) {
        const { data: next } = await supabaseAdmin
          .from('checkpoints')
          .select('*')
          .eq('order_index', (checkpoint?.order_index || 0) + 1)
          .eq('is_active', true)
          .single()

        if (next) {
          nextCheckpoint = next
          // Unlock next checkpoint for this team
          await supabaseAdmin
            .from('team_progress')
            .upsert({
              team_id: teamId,
              checkpoint_id: next.id,
              status: 'unlocked',
            }, { onConflict: 'team_id,checkpoint_id' })
        }
      }

      return NextResponse.json({
        correct: true,
        points: challenge.points,
        message: `Correct! +${challenge.points} points`,
        isFinal: checkpoint?.is_final || false,
        nextCheckpoint,
      })
    } else {
      // 7d. Apply wrong answer penalty to team
      const penaltySeconds = eventSettings?.wrong_answer_penalty_seconds || 60
      await supabaseAdmin
        .from('teams')
        .update({
          total_penalties_seconds: team.total_penalties_seconds + penaltySeconds,
        })
        .eq('id', teamId)

      return NextResponse.json({
        correct: false,
        penalty: penaltySeconds,
        message: `Wrong answer. -${penaltySeconds}s penalty applied.`,
      })
    }
  } catch (err) {
    console.error('submit-answer error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
