import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mesurerDecalage } from '../lib/horloge'
import { chargerVueEquipe, type VueEquipe } from '../lib/participant'

/**
 * État d'équipe en temps réel, selon le principe « signal puis relecture »
 * (voir CLAUDE.md) : on écoute les changements sur les tables filtrées par RLS,
 * et à chaque signal on RELIT l'état complet via `get_team_view()`. L'état
 * n'est jamais reconstruit à partir du contenu des messages reçus.
 *
 * Le décalage d'horloge est mesuré au chargement et à chaque reconnexion,
 * pour que le minuteur reste juste même après une veille de l'appareil.
 */

export type EtatConnexion = 'connexion' | 'connecte' | 'interrompu'

/** Regroupe les signaux rapprochés : une rafale ne déclenche qu'une relecture. */
const ATTENTE_REGROUPEMENT_MS = 250

/** Filet de sécurité si un signal est perdu (réseau capricieux, veille longue). */
const RELECTURE_PERIODIQUE_MS = 30_000

export interface EtatEquipe {
  vue: VueEquipe | null
  decalageMs: number
  connexion: EtatConnexion
  erreur: string | null
  /** Relecture immédiate, à la demande (après une action de l'utilisateur). */
  relire: () => Promise<void>
}

export function useVueEquipe(equipeId: string): EtatEquipe {
  const [vue, setVue] = useState<VueEquipe | null>(null)
  const [decalageMs, setDecalageMs] = useState(0)
  const [connexion, setConnexion] = useState<EtatConnexion>('connexion')
  const [erreur, setErreur] = useState<string | null>(null)
  const actif = useRef(true)
  const attente = useRef<number | undefined>(undefined)

  const relire = useCallback(async () => {
    try {
      const fraiche = await chargerVueEquipe(equipeId)
      if (!actif.current) return
      setVue(fraiche)
      setErreur(null)
    } catch (e) {
      if (!actif.current) return
      setErreur(e instanceof Error ? e.message : 'État indisponible.')
    }
  }, [equipeId])

  /** Relecture groupée : plusieurs signaux simultanés ne coûtent qu'un appel. */
  const relireBientot = useCallback(() => {
    window.clearTimeout(attente.current)
    attente.current = window.setTimeout(() => void relire(), ATTENTE_REGROUPEMENT_MS)
  }, [relire])

  /** Reprise après coupure, veille ou rechargement : horloge puis état. */
  const resynchroniser = useCallback(async () => {
    try {
      const decalage = await mesurerDecalage()
      if (actif.current) setDecalageMs(decalage)
    } catch {
      // Sans mesure, on garde le décalage précédent : mieux que rien.
    }
    await relire()
  }, [relire])

  useEffect(() => {
    actif.current = true
    void resynchroniser()

    const canal = supabase
      .channel(`equipe-${equipeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `id=eq.${equipeId}` },
        relireBientot,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answer_drafts', filter: `team_id=eq.${equipeId}` },
        relireBientot,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `team_id=eq.${equipeId}` },
        relireBientot,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers', filter: `team_id=eq.${equipeId}` },
        relireBientot,
      )
      .subscribe((statut) => {
        if (!actif.current) return
        if (statut === 'SUBSCRIBED') {
          setConnexion('connecte')
          void resynchroniser()
        } else if (statut === 'CHANNEL_ERROR' || statut === 'TIMED_OUT' || statut === 'CLOSED') {
          setConnexion('interrompu')
        }
      })

    const surReveil = () => {
      if (document.visibilityState === 'visible') void resynchroniser()
    }
    document.addEventListener('visibilitychange', surReveil)
    window.addEventListener('online', surReveil)
    const surCoupure = () => setConnexion('interrompu')
    window.addEventListener('offline', surCoupure)

    const periodique = window.setInterval(() => void relire(), RELECTURE_PERIODIQUE_MS)

    return () => {
      actif.current = false
      window.clearTimeout(attente.current)
      window.clearInterval(periodique)
      document.removeEventListener('visibilitychange', surReveil)
      window.removeEventListener('online', surReveil)
      window.removeEventListener('offline', surCoupure)
      void supabase.removeChannel(canal)
    }
  }, [equipeId, relire, relireBientot, resynchroniser])

  return { vue, decalageMs, connexion, erreur, relire }
}
