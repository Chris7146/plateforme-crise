import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Exercices } from './Exercices'
import type { Exercice, ResumeExercice } from '../lib/exercices'

// Seuls les accès réseau sont simulés : les fonctions pures de regroupement
// et de formatage restent celles de production.
vi.mock('../lib/exercices', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../lib/exercices')>()
  return {
    ...reel,
    chargerExercices: vi.fn(),
    listerClients: vi.fn(),
    creerModele: vi.fn(),
    creerVariante: vi.fn(),
    creerClient: vi.fn(),
  }
})

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { email: 'animateur@exemple.fr' } },
    estAnimateur: true,
    chargement: false,
    connexion: vi.fn(),
    deconnexion: vi.fn(),
  }),
}))

const { chargerExercices, listerClients, creerModele, creerVariante } = await import(
  '../lib/exercices'
)

function resume(
  partiel: Partial<Exercice> & Pick<Exercice, 'id' | 'kind' | 'title'>,
  agregats: Partial<Pick<ResumeExercice, 'nbEtapes' | 'dureeSecondes' | 'nomClient'>> = {},
): ResumeExercice {
  return {
    exercice: {
      description: null,
      client_id: null,
      source_id: null,
      max_content_score: 8,
      max_time_bonus: 2,
      created_by: null,
      created_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-01T10:00:00Z',
      ...partiel,
    },
    nomClient: agregats.nomClient ?? null,
    nbEtapes: agregats.nbEtapes ?? 0,
    dureeSecondes: agregats.dureeSecondes ?? 0,
  }
}

function afficher() {
  return render(
    <MemoryRouter>
      <Exercices />
    </MemoryRouter>,
  )
}

describe('écran des modèles et variantes', () => {
  beforeEach(() => {
    vi.mocked(chargerExercices).mockResolvedValue([])
    vi.mocked(listerClients).mockResolvedValue([])
    vi.mocked(creerModele).mockResolvedValue('ex-neuf')
    vi.mocked(creerVariante).mockResolvedValue('ex-variante')
  })

  it('invite à créer un premier modèle quand la bibliothèque est vide', async () => {
    afficher()
    expect(await screen.findByText('Aucun modèle pour le moment.')).toBeInTheDocument()
  })

  it('affiche chaque variante sous son modèle avec sa charge', async () => {
    vi.mocked(chargerExercices).mockResolvedValue([
      resume({ id: 'ex-a', kind: 'template', title: 'Cyberattaque' }, { nbEtapes: 6, dureeSecondes: 53 * 60 }),
      resume(
        { id: 'ex-a1', kind: 'variant', title: 'CHU de Valmont', source_id: 'ex-a' },
        { nbEtapes: 6, dureeSecondes: 45 * 60, nomClient: 'CHU de Valmont' },
      ),
    ])
    afficher()

    expect(await screen.findByText('Cyberattaque')).toBeInTheDocument()
    expect(screen.getByText('6 étapes · 0 h 53')).toBeInTheDocument()
    expect(screen.getByText('CHU de Valmont')).toBeInTheDocument()
    expect(screen.getByText('modèle')).toBeInTheDocument()
    expect(screen.getByText('variante')).toBeInTheDocument()
  })

  it('signale les variantes dont le modèle d’origine a disparu', async () => {
    vi.mocked(chargerExercices).mockResolvedValue([
      resume({ id: 'ex-o', kind: 'variant', title: 'Variante isolée', source_id: null }),
    ])
    afficher()
    expect(await screen.findByText('Variantes sans modèle d’origine')).toBeInTheDocument()
    expect(screen.getByText('Variante isolée')).toBeInTheDocument()
  })

  it('crée un modèle depuis la fenêtre dédiée', async () => {
    const utilisateur = userEvent.setup()
    afficher()
    await utilisateur.click(await screen.findByRole('button', { name: 'Nouveau modèle' }))
    await utilisateur.type(screen.getByLabelText('Titre du modèle'), 'Inondation')
    await utilisateur.click(screen.getByRole('button', { name: 'Créer le modèle' }))

    await waitFor(() => expect(creerModele).toHaveBeenCalledWith('Inondation', ''))
  })

  it('crée une variante en passant par create_variant avec un client existant', async () => {
    const utilisateur = userEvent.setup()
    vi.mocked(chargerExercices).mockResolvedValue([
      resume({ id: 'ex-a', kind: 'template', title: 'Cyberattaque' }, { nbEtapes: 2, dureeSecondes: 900 }),
    ])
    vi.mocked(listerClients).mockResolvedValue([
      { id: 'cli-1', name: 'CHU de Valmont', created_at: '2026-09-01T10:00:00Z' },
    ])
    afficher()

    await utilisateur.click(await screen.findByRole('button', { name: 'Créer une variante' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Créer la variante' }))

    // Titre par défaut : le nom du client sélectionné.
    await waitFor(() =>
      expect(creerVariante).toHaveBeenCalledWith('ex-a', 'cli-1', 'CHU de Valmont'),
    )
  })
})
