import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  /** Rôle vérifié côté base via la RPC `is_staff()` (jamais déduit de l'interface). */
  estAnimateur: boolean
  chargement: boolean
  connexion: (email: string, motDePasse: string) => Promise<void>
  deconnexion: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [estAnimateur, setEstAnimateur] = useState(false)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    let actif = true

    async function verifierRole(sessionCourante: Session | null) {
      if (!sessionCourante) {
        if (actif) setEstAnimateur(false)
        return
      }
      const { data, error } = await supabase.rpc('is_staff')
      if (actif) setEstAnimateur(!error && data === true)
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!actif) return
      setSession(data.session)
      await verifierRole(data.session)
      if (actif) setChargement(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sessionCourante) => {
      if (!actif) return
      setSession(sessionCourante)
      await verifierRole(sessionCourante)
    })

    return () => {
      actif = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      estAnimateur,
      chargement,
      connexion: async (email, motDePasse) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: motDePasse,
        })
        if (error) throw error
      },
      deconnexion: async () => {
        await supabase.auth.signOut()
      },
    }),
    [session, estAnimateur, chargement],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
