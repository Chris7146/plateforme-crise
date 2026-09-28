import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QrCode } from '../components/QrCode'
import { Bouton, Erreur, LienBouton } from '../components/ui'
import { chargerSession, urlRejoindre, type DetailSession } from '../lib/sessions'

/**
 * Page des codes d'accès, à projeter ou imprimer (lot 2).
 * Volontairement dépouillée : gros caractères, lisibles du fond de la salle.
 */
export function CodesEquipes() {
  const { id = '' } = useParams()
  const [detail, setDetail] = useState<DetailSession | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    chargerSession(id)
      .then((donnees) => {
        if (!donnees) setErreur('Session introuvable.')
        else setDetail(donnees)
      })
      .catch((e) => setErreur(e instanceof Error ? e.message : 'Chargement impossible.'))
  }, [id])

  if (erreur) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8">
        <Erreur>{erreur}</Erreur>
        <div>
          <LienBouton to="/animateur/sessions">Retour aux sessions</LienBouton>
        </div>
      </div>
    )
  }

  if (!detail) return <p className="px-4 py-8 text-sm text-secondaire">Chargement…</p>

  const origine = window.location.origin

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs text-secondaire">codes d’accès à projeter</p>
          <h1 className="text-xl text-vert">{detail.session.title}</h1>
        </div>
        <div className="flex gap-3">
          <Bouton variante="secondaire" onClick={() => window.print()}>
            Imprimer
          </Bouton>
          <LienBouton to={`/animateur/sessions/${detail.session.id}`}>Retour</LienBouton>
        </div>
      </header>

      <p className="text-center text-sm text-secondaire">
        Rendez-vous sur <span className="text-texte">{origine}</span> puis saisissez le code de
        votre équipe — ou scannez directement le QR code.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {detail.equipes.map((equipe) => (
          <li
            key={equipe.id}
            className="flex flex-col items-center gap-3 rounded-lg border border-bordure bg-carte p-6 text-center"
          >
            <h2 className="text-lg text-texte">{equipe.name}</h2>
            <QrCode valeur={urlRejoindre(equipe.join_code, origine)} taille={180} />
            <code className="text-3xl tracking-[0.35em] text-vert">{equipe.join_code}</code>
          </li>
        ))}
      </ul>
    </div>
  )
}
