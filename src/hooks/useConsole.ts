import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mesurerDecalage } from '../lib/horloge'
import { chargerConsole, type EtatConsole } from '../lib/console'

/**
 * État de la console animateur en temps réel (lot 4), selon le même principe
 * « signal puis relecture » que l'écran participant.
 *
 * Le journal `events` sert de signal universel : toute action significative y
 * produit un événement (réponse validée, note, indice, passage d'étape décidé
 * par le serveur). S'y ajoutent `teams` et `messages`, qui changent aussi sans
 * passer par une RPC (lecture des messages, minuteurs).
 */

export type EtatConnexion = 'connexion' | 'connecte' | 'interrompu'

const ATTENTE_REGROUPEMENT_MS = 250
const RELECTURE_PERIODIQUE_MS = 30_000

export interface ConsoleTempsReel {
  etat: EtatConsole | null
  decalageMs: number
  connexion: EtatConnexion
  erreur: string | null
  relire: () => Promise<void>
}

export function useConsole(sessionId: string): ConsoleTempsReel {
  const [etat, setEtat] = useState<EtatConsole | null>(null)
  const [decalageMs, setDecalageMs] = useState(0)
  const [connexion, setConnexion] = useState<EtatConnexion>('connexion')
  const [erreur, setErreur] = useState<string | null>(null)
  const actif = useRef(true)
  const attente = useRef<number | undefined>(undefined)

  const relire = useCallback(async () => {
    try {
      const frais = await chargerConsole(sessionId)
      if (!actif.current) return
      if (!frais) {
        setErreur('Session introuvable.')
        return
      }
      setEtat(frais)
      setErreur(null)
    } catch (e) {
      if (!actif.current) return
      setErreur(e instanceof Error ? e.message : 'État indisponible.')
    }
  }, [sessionId])

  const relireBientot = useCallback(() => {
    window.clearTimeout(attente.current)
    attente.current = window.setTimeout(() => void relire(), ATTENTE_REGROUPEMENT_MS)
  }, [relire])

  const resynchroniser = useCallback(async () => {
    try {
      const decalage = await mesurerDecalage()
      if (actif.current) setDecalageMs(decalage)
    } catch {
      // On conserve le décalage précédent plutôt que de fausser les minuteurs.
    }
    await relire()
  }, [relire])

  useEffect(() => {
    actif.current = true
    void resynchroniser()

    const canal = supabase
      .channel(`console-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `session_id=eq.${sessionId}` },
        relireBientot,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${sessionId}` },
        relireBientot,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `session_id=eq.${sessionId}` },
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
  }, [sessionId, relire, relireBientot, resynchroniser])

  return { etat, decalageMs, connexion, erreur, relire }
}
