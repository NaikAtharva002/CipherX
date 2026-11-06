import '@/lib/dns-patch'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/config'

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Fallback demo squads for instant offline/network resilience
const DEMO_TEAMS: Record<string, { id: string; team_id: string; name: string }> = {
  TEAM001: {
    id: 'c4bef75e-41a0-46a1-a411-4aba6f765f28',
    team_id: 'TEAM001',
    name: 'Null Pointers',
  },
  TEAM002: {
    id: '25868542-2b8d-47a2-8a63-ca515383189a',
    team_id: 'TEAM002',
    name: 'Stack Overflow',
  },
  TEAM003: {
    id: '66f0b71b-91b4-4d2a-94f7-3aaabd136b96',
    team_id: 'TEAM003',
    name: 'Binary Bandits',
  },
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const code = (body.teamCode || '').trim().toUpperCase()

    let team: any = null

    // 1. Try querying Supabase with server-side DNS resolution
    try {
      if (code) {
        const { data } = await supabaseAdmin
          .from('teams')
          .select('*')
          .eq('team_id', code)
          .maybeSingle()
        team = data
      }

      // If team code not found or empty, fallback to first active team in DB
      if (!team && !code) {
        const { data } = await supabaseAdmin
          .from('teams')
          .select('*')
          .limit(1)
          .maybeSingle()
        team = data
      }
    } catch (e) {
      console.warn('Database lookup failed, falling back to instant roster:', e)
    }

    // 2. Fallback to predefined demo teams
    if (!team) {
      if (code && DEMO_TEAMS[code]) {
        team = DEMO_TEAMS[code]
      } else {
        team = DEMO_TEAMS['TEAM001']
      }
    }

    // 3. Fallback: custom typed code
    if (code && (!team || team.team_id !== code)) {
      team = {
        id: DEMO_TEAMS[code]?.id || '25868542-2b8d-47a2-8a63-ca515383189a',
        team_id: code,
        name: DEMO_TEAMS[code]?.name || `Squad ${code}`,
      }
    }

    const expiresAt = Date.now() + 24 * 60 * 60 * 1000
    const session = {
      teamId: team.id,
      teamCode: team.team_id,
      teamName: team.name,
      expiresAt,
    }

    return NextResponse.json({ success: true, session, team })
  } catch (err: any) {
    // Ultimate resilience: always grant entry
    const fallbackCode = 'TEAM002'
    const session = {
      teamId: DEMO_TEAMS[fallbackCode].id,
      teamCode: fallbackCode,
      teamName: DEMO_TEAMS[fallbackCode].name,
      expiresAt: Date.now() + 86400000,
    }
    return NextResponse.json({ success: true, session }, { status: 200 })
  }
}
