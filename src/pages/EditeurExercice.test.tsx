import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditeurExercice } from './EditeurExercice'
import type { Etape, Exercice } from '../lib/exercices'

vi.mock('../lib/exercices', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../lib/exercices')>()
  return { ...reel, chargerExercice: vi.fn() }
})

vi.mock('../lib/etapes', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../lib/etapes')>()
  return {
    ...reel,
    creerEtape: vi.fn(),
    majEtape: vi.fn(),
    supprimerEtape: vi.fn(),
    reordonnerEtapes: vi.fn(),
  }
})

vi.mock('../lib/elements', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../lib/elements')>()
  return { ...reel, chargerElements: vi.fn() }
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

const { chargerExercice } = await import('../lib/exercices')
const { majEtape, reordonnerEtapes } = await import('../lib/etapes')
const { chargerElements } = await import('../lib/elements')

const exercice: Exercice = {
  id: 'ex-1',
  kind: 'variant',
  title: 'CHU de Valmont',
  description: null,
  client_id: 'cli-1',
  source_id: 'ex-modele',
  max_content_score: 8,
  max_time_bonus: 2,
  created_by: null,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
}

function etape(partiel: Partial<Etape> & Pick<Etape, 'id' | 'title' | 'position'>): Etape {
  return {
    exercise_id: 'ex-1',
    duration_seconds: 5 * 60,
    end_of_time: 'facilitator',
    advance_on_submit: false,
    ambient_audio_path: null,
    source_id: null,
    is_modified: false,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    ...partiel,
  }
}

const etapes = [
  etape({ id: 'st-1', title: 'Alerte initiale', position: 0, duration_seconds: 300 }),
  etape({ id: 'st-2', title: 'Propagation', position: 1, duration_seconds: 480 }),
]

function afficher() {
  return render(
    <MemoryRouter initialEntries={['/animateur/exercices/ex-1']}>
      <Routes>
        <Route path="/animateur/exercices/:id" element={<EditeurExercice />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('éditeur d’étapes', () => {
  beforeEach(() => {
    vi.mocked(chargerExercice).mockResolvedValue({ exercice, etapes })
    vi.mocked(chargerElements).mockResolvedValue({ contenus: [], questions: [], indices: [] })
    vi.mocked(reordonnerEtapes).mockResolvedValue()
  })

  it('affiche les étapes numérotées et la charge totale', async () => {
    afficher()
    expect(await screen.findByText('1. Alerte initiale')).toBeInTheDocument()
    expect(screen.getByText('2. Propagation')).toBeInTheDocument()
    expect(screen.getByText('2 étapes · 0 h 13')).toBeInTheDocument()
  })

  it('sélectionne la première étape et charge ses éléments', async () => {
    afficher()
    await waitFor(() => expect(chargerElements).toHaveBeenCalledWith('st-1'))
    expect(await screen.findByLabelText('Titre de l’étape')).toHaveValue('Alerte initiale')
  })

  it('réordonne par la RPC reorder_steps avec la liste complète', async () => {
    const utilisateur = userEvent.setup()
    afficher()
    await utilisateur.click(
      await screen.findByLabelText('Déplacer « Propagation » vers le haut'),
    )
    await waitFor(() =>
      expect(reordonnerEtapes).toHaveBeenCalledWith('ex-1', ['st-2', 'st-1']),
    )
  })

  it('n’enregistre l’étape qu’après modification effective', async () => {
    const utilisateur = userEvent.setup()
    vi.mocked(majEtape).mockResolvedValue({ ...etapes[0], title: 'Alerte initiale renforcée' })
    afficher()

    const bouton = await screen.findByRole('button', { name: 'Enregistrer l’étape' })
    expect(bouton).toBeDisabled()

    await utilisateur.type(screen.getByLabelText('Titre de l’étape'), ' renforcée')
    expect(screen.getByText('non enregistrée')).toBeInTheDocument()
    await utilisateur.click(bouton)

    await waitFor(() =>
      expect(majEtape).toHaveBeenCalledWith(
        'st-1',
        expect.objectContaining({ title: 'Alerte initiale renforcée' }),
      ),
    )
  })

  it('propose les deux réglages de fin du temps', async () => {
    afficher()
    const selecteur = await screen.findByLabelText('Fin du temps')
    expect(selecteur).toHaveValue('facilitator')
    expect(screen.getByRole('option', { name: /passage automatique/ })).toBeInTheDocument()
  })
})
