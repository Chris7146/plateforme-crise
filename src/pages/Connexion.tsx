import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Bouton, Carte, Champ } from '../components/ui'

/** Connexion animateur (e-mail + mot de passe). */
export function Connexion() {
  const { connexion } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnCours(true)
    try {
      await connexion(email, motDePasse)
      navigate('/animateur', { replace: true })
    } catch {
      setErreur('Identifiants invalides ou accès refusé.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-xl text-vert">Console animateur — connexion</h1>
      <Carte>
        <form onSubmit={soumettre} className="flex flex-col gap-4">
          <Champ
            id="email"
            label="Adresse e-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Champ
            id="motdepasse"
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
          {erreur && <p className="text-sm text-rouge">{erreur}</p>}
          <Bouton type="submit" disabled={enCours}>
            {enCours ? 'Connexion…' : 'Se connecter'}
          </Bouton>
        </form>
      </Carte>
    </div>
  )
}
