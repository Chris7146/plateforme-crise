import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Participant } from './Participant'
import type { VueEquipe } from '../lib/participant'

// Le hook temps réel est simulé : les tests portent sur l'écran, pas sur Realtime.
vi.mock('../hooks/useVueEquipe', () => ({ useVueEquipe: vi.fn() }))
vi.mock('../lib/participant', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../lib/participant')>()
  return {
    ...reel,
    enregistrerBrouillon: vi.fn().mockResolvedValue(undefined),
    validerReponses: vi.fn().mockResolvedValue(undefined),
    envoyerMessage: vi.fn().mockResolvedValue(undefined),
  }
})
vi.mock('../hooks/useUrlMedia', () => ({
  useUrlMedia: () => ({ url: 'https://exemple/media', erreur: false }),
}))

const { useVueEquipe } = await import('../hooks/useVueEquipe')
const { validerReponses, enregistrerBrouillon } = await import('../lib/participant')

function vue(partiel: Partial<VueEquipe> = {}, equipe: Partial<VueEquipe['team']> = {}): VueEquipe {
  return {
    server_now: '2026-10-12T09:00:00Z',
    session: { id: 'se-1', title: 'Exercice du 12 octobre', status: 'running' },
    team: {
      id: 'eq-1',
      name: 'Équipe 3',
      status: 'running',
      current_step: 2,
      step_count: 6,
      step_started_at: '2026-10-12T09:00:00Z',
      step_deadline: '2026-10-12T09:08:00Z',
      remaining_on_pause_seconds: null,
      state_version: 4,
      ...equipe,
    },
    participants: [{ name: 'Camille' }, { name: 'Dominique' }],
    messages: [],
    step: {
      index: 2,
      title: 'Propagation',
      duration_seconds: 480,
      ambient_audio_path: null,
      contents: [
        { id: 'c-1', type: 'article', title: 'Flash info', body: 'Les urgences réorientent.' },
      ],
      hints: [{ id: 'h-1', body: 'Désignez un porte-parole.' }],
      questions: [
        {
          id: 'q-1',
          type: 'multiple_choice',
          prompt: 'Quelles décisions ?',
          options: [
            { id: 'a', label: 'Isoler le réseau' },
            { id: 'b', label: 'Payer la rançon' },
          ],
          mandatory: true,
        },
        { id: 'q-2', type: 'open', prompt: 'Réponse au journaliste', mandatory: false },
      ],
    },
    drafts: {},
    submitted: false,
    ...partiel,
  }
}

function simuler(vueCourante: VueEquipe | null, extra: Record<string, unknown> = {}) {
  vi.mocked(useVueEquipe).mockReturnValue({
    vue: vueCourante,
    decalageMs: 0,
    connexion: 'connecte',
    erreur: null,
    relire: vi.fn().mockResolvedValue(undefined),
    ...extra,
  } as ReturnType<typeof useVueEquipe>)
}

function afficher() {
  return render(
    <MemoryRouter initialEntries={['/participant/eq-1']}>
      <Routes>
        <Route path="/participant/:id" element={<Participant />} />
        <Route path="/" element={<p>accueil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('écran participant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('affiche l’étape, la progression et le minuteur', () => {
    simuler(vue())
    afficher()
    expect(screen.getByText('étape 3 / 6 · Propagation')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
    expect(screen.getByRole('timer')).toBeInTheDocument()
  })

  it('affiche les contenus diffusés et les indices reçus', () => {
    simuler(vue())
    afficher()
    expect(screen.getByText('Les urgences réorientent.')).toBeInTheDocument()
    expect(screen.getByText('Désignez un porte-parole.')).toBeInTheDocument()
  })

  it('enregistre un choix dans le brouillon partagé', async () => {
    const utilisateur = userEvent.setup()
    simuler(vue())
    afficher()
    await utilisateur.click(screen.getByRole('button', { name: /Isoler le réseau/ }))
    await waitFor(() =>
      expect(enregistrerBrouillon).toHaveBeenCalledWith('eq-1', 'q-1', { choices: ['a'] }),
    )
  })

  it('refuse la validation tant qu’une question obligatoire est vide', async () => {
    const utilisateur = userEvent.setup()
    simuler(vue())
    afficher()
    await utilisateur.click(screen.getByRole('button', { name: /valider la réponse d’équipe/ }))
    expect(await screen.findByText(/Réponse obligatoire manquante/)).toBeInTheDocument()
    expect(validerReponses).not.toHaveBeenCalled()
  })

  it('valide la réponse d’équipe quand les obligatoires sont remplies', async () => {
    const utilisateur = userEvent.setup()
    simuler(vue({ drafts: { 'q-1': { choices: ['a'] } } }))
    afficher()
    await utilisateur.click(screen.getByRole('button', { name: /valider la réponse d’équipe/ }))
    await waitFor(() => expect(validerReponses).toHaveBeenCalledWith('eq-1'))
  })

  it('annonce la réponse transmise et retire le bouton', () => {
    simuler(vue({ submitted: true }))
    afficher()
    expect(screen.getByText(/Réponse transmise/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /valider la réponse d’équipe/ }),
    ).not.toBeInTheDocument()
  })

  it('affiche la salle d’attente avant le démarrage', () => {
    simuler(vue({ step: null }, { status: 'waiting' }))
    afficher()
    expect(screen.getByText('En attente du démarrage par l’animateur.')).toBeInTheDocument()
    expect(screen.getByText('Participants connectés (2)')).toBeInTheDocument()
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
  })

  it('signale la pause et affiche le temps figé par le serveur', () => {
    // `pause_session()` fige le reste dans remaining_on_pause_seconds.
    simuler(
      vue(
        { session: { id: 'se-1', title: 'Exercice', status: 'paused' } },
        { remaining_on_pause_seconds: 137 },
      ),
    )
    afficher()
    expect(screen.getByText('exercice en pause')).toBeInTheDocument()
    expect(screen.getByText('temps figé')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('2:17')
  })

  it('laisse valider après le temps écoulé', () => {
    simuler(vue({ drafts: { 'q-1': { choices: ['a'] } } }, { status: 'time_up' }))
    afficher()
    // Le libellé figure à la fois dans le bandeau d'état et au-dessus du minuteur.
    expect(screen.getAllByText(/temps écoulé/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /valider la réponse d’équipe/ })).toBeEnabled()
  })

  it('annonce l’interruption après un arrêt général', () => {
    simuler(vue({ session: { id: 'se-1', title: 'Exercice', status: 'stopped' } }))
    afficher()
    expect(screen.getByText('L’exercice a été interrompu par l’animateur.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Questions de l’étape')).not.toBeInTheDocument()
  })

  it('affiche l’état du lien temps réel', () => {
    simuler(vue(), { connexion: 'interrompu' })
    afficher()
    expect(screen.getByText('reconnexion…')).toBeInTheDocument()
  })
})
