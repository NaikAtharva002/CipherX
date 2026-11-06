import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import type { Profile, Team, TeamMember } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface TeamData {
  team: Team
  members: TeamMember[]
}

interface AuthState {
  // State
  user: User | null
  profile: Profile | null
  teamData: TeamData | null
  isOrganiser: boolean
  loading: boolean

  // Actions
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setTeamData: (teamData: TeamData | null) => void
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      profile: null,
      teamData: null,
      isOrganiser: false,
      loading: true,

      setUser: (user) =>
        set({ user }, false, 'setUser'),

      setProfile: (profile) =>
        set(
          {
            profile,
            isOrganiser: profile?.role === 'organiser',
          },
          false,
          'setProfile'
        ),

      setTeamData: (teamData) =>
        set({ teamData }, false, 'setTeamData'),

      signOut: async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        set(
          {
            user: null,
            profile: null,
            teamData: null,
            isOrganiser: false,
          },
          false,
          'signOut'
        )
      },

      initialize: async () => {
        set({ loading: true }, false, 'initialize/start')
        const supabase = createClient()

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (!user) {
            set(
              { user: null, profile: null, teamData: null, isOrganiser: false, loading: false },
              false,
              'initialize/noUser'
            )
            return
          }

          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          const isOrg = profile?.role === 'organiser'

          // If participant, fetch team data
          let teamData: TeamData | null = null
          if (!isOrg && profile) {
            // Find team member record by email
            const { data: memberRecord } = await supabase
              .from('team_members')
              .select('team_id')
              .eq('email', profile.email)
              .single()

            if (memberRecord?.team_id) {
              const [{ data: team }, { data: members }] = await Promise.all([
                supabase
                  .from('teams')
                  .select('*')
                  .eq('id', memberRecord.team_id)
                  .single(),
                supabase
                  .from('team_members')
                  .select('*')
                  .eq('team_id', memberRecord.team_id),
              ])

              if (team) {
                teamData = { team, members: members ?? [] }
              }
            }
          }

          set(
            {
              user,
              profile: profile ?? null,
              teamData,
              isOrganiser: isOrg,
              loading: false,
            },
            false,
            'initialize/done'
          )
        } catch (err) {
          console.error('[AuthStore] initialize error:', err)
          set({ loading: false }, false, 'initialize/error')
        }
      },
    }),
    { name: 'CipherX:Auth' }
  )
)
