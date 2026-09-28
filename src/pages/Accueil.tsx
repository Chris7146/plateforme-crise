import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PluieChiffres } from '../components/PluieChiffres'
import { Bouton, Champ, Erreur } from '../components/ui'
import { codeComplet, normaliserCode } from '../lib/sessions'
import {
  lireEquipeMemorisee,
  messageErreurEntree,
  rejoindreEquipe,
  validerPrenom,
} from '../lib/participant'

/**
 * Accueil participant (lot 2, maquette `accueil.html`).
 *
 * Deux temps : saisie du code et du prénom, puis acceptation des conditions.
 * L'entrée dans l'équipe n'a lieu qu'après la case cochée : `join_team()`
 * exige l'acceptation, et la refuse côté base si elle manque.
 */
export function Accueil() {
  const navigate = useNavigate()
  const [parametres] = useSearchParams()
  const memoire = lireEquipeMemorisee()

  const [etape, setEtape] = useState<'saisie' | 'conditions'>('saisie')
  const [code, setCode] = useState(normaliserCode(parametres.get('code') ?? ''))
  const [prenom, setPrenom] = useState(memoire?.prenom ?? '')
  const [accepte, setAccepte] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  // Un QR code scanné pré-remplit le code : on passe directement au prénom.
  useEffect(() => {
    const depuisUrl = parametres.get('code')
    if (depuisUrl) setCode(normaliserCode(depuisUrl))
  }, [parametres])

  function continuer(e: React.FormEvent) {
    e.preventDefault()
    const problemePrenom = validerPrenom(prenom)
    if (!codeComplet(code)) {
      setErreur('Le code d’équipe compte six caractères.')
      return
    }
    if (problemePrenom) {
      setErreur(problemePrenom)
      return
    }
    setErreur(null)
    setEtape('conditions')
  }

  async function commencer() {
    setEnCours(true)
    setErreur(null)
    try {
      const equipeId = await rejoindreEquipe(code, prenom, accepte)
      navigate(`/participant/${equipeId}`, { replace: true })
    } catch (err) {
      setErreur(messageErreurEntree(err))
      setEnCours(false)
    }
  }

  return (
    <div className="relative min-h-[80vh] overflow-hidden">
      <PluieChiffres />

      <div className="relative mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-12 text-center">
        <div>
          <p className="text-3xl tracking-[2px] text-vert">
            sim<span className="text-secondaire">//</span>crise
          </p>
          <p className="mt-1 text-xs text-secondaire">
            plateforme d’exercices de gestion de crise
          </p>
        </div>

        {memoire && etape === 'saisie' ? (
          <div className="w-full rounded-lg border border-bordure bg-carte p-4 text-left">
            <p className="text-sm text-secondaire">
              Vous participiez déjà à un exercice sur cet appareil.
            </p>
            <div className="mt-3">
              <Bouton onClick={() => navigate(`/participant/${memoire.equipeId}`)}>
                Revenir à mon équipe
              </Bouton>
            </div>
          </div>
        ) : null}

        {etape === 'saisie' ? (
          <form
            className="flex w-full flex-col gap-4 rounded-lg border border-bordure bg-carte p-6 text-left"
            onSubmit={continuer}
          >
            <Champ
              label="Code d’équipe"
              id="code-equipe"
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
              placeholder="7KQ2MV"
              className="text-center text-2xl tracking-[0.35em]"
              value={code}
              onChange={(e) => setCode(normaliserCode(e.target.value))}
            />
            <Champ
              label="Votre prénom"
              id="prenom"
              autoComplete="given-name"
              maxLength={60}
              placeholder="Camille"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
            />
            <Erreur>{erreur}</Erreur>
            <Bouton type="submit" disabled={!codeComplet(code) || prenom.trim().length === 0}>
              Continuer
            </Bouton>
          </form>
        ) : (
          <div className="flex w-full flex-col gap-4 rounded-lg border border-bordure bg-carte p-6 text-left">
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex gap-3">
                <dt className="w-24 text-secondaire">code équipe</dt>
                <dd className="tracking-[0.3em] text-vert">{code}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 text-secondaire">prénom</dt>
                <dd className="text-texte">{prenom.trim()}</dd>
              </div>
            </dl>

            <p className="border-l-2 border-bordure pl-3 text-sm leading-relaxed text-secondaire">
              Les informations diffusées sont fictives. Ne communiquez aucun contenu hors de la
              salle. L’animateur peut interrompre l’exercice à tout moment.
            </p>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={accepte}
                onChange={(e) => setAccepte(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-[#3ecf8e]"
              />
              J’ai lu et j’accepte les conditions de participation à l’exercice
            </label>

            <Erreur>{erreur}</Erreur>

            <div className="flex flex-wrap gap-3">
              <Bouton
                variante="secondaire"
                onClick={() => {
                  setEtape('saisie')
                  setErreur(null)
                }}
              >
                Retour
              </Bouton>
              <Bouton onClick={commencer} disabled={!accepte || enCours} className="flex-1">
                {enCours ? 'connexion…' : '[ commencer la simulation ]'}
              </Bouton>
            </div>
          </div>
        )}

        <Link to="/connexion" className="text-xs text-secondaire underline underline-offset-4">
          Accès animateur
        </Link>
      </div>
    </div>
  )
}
