import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Console } from './Console'
import { lireSnapshot, type EtatConsole } from '../lib/console'
import type { Equipe, Session } from '../lib/sessions'

vi.mock('../hooks/useConsole', () => ({ useConsole: vi.fn() }))
vi.mock('../lib/console', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../lib/console')>()
  return {
    ...reel,
    ajouterTemps: vi.fn().mockResolvedValue(undefined),
    etapeSuivante: vi.fn().mockResolvedValue(undefined),
    mettreEnPause: vi.fn().mockResolvedValue(undefined),
    reprendre: vi.fn().mockResolvedValue(undefined),
    terminer: vi.fn().mockResolvedValue(undefined),
    arreter: vi.fn().mockResolvedValue(undefined),
    noter: vi.fn().mockResolvedValue(undefined),
    diffuser: vi.fn().mockResolvedValue(undefined),
    marquerMessagesLus: vi.fn().mockResolvedValue(undefined),
    journaliserVisio: vi.fn().mockResolvedValue(undefined),
    enregistrerLienVisio: vi.fn().mockResolvedValue(undefined),
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

const { useConsole } = await import('../hooks/useConsole')
const { ajouterTemps, arreter, mettreEnPause, noter, diffuser } = await import('../lib/console')

const snapshotBrut = {
  exercise: { id: 'ex-1', title: 'Cyberattaque', max_content_score: 8, max_time_bonus: 2 },
  steps: [
    {
      id: 'st-1',
      position: 0,
      title: 'Alerte initiale',
      duration_seconds: 300,
      end_of_time: 'facilitator',
      advance_on_submit: false,
      contents: [
        {
          id: 'c-1',
          type: 'article',
          title: 'Flash info',
          trigger_mode: 'manual',
          trigger_offset_seconds: 0,
        },
      ],
      questions: [
        {
          id: 'q-1',
          type: 'open',
          prompt: 'Vos actions ?',
          options: [],
          mandatory: true,
          expected_answer: 'Isoler le réseau',
          scoring_guide: '3 pts par action',
        },
      ],
      hints: [
        { id: 'h-1', body: 'Vérifier le SIH', trigger_mode: 'manual', trigger_offset_seconds: 0 },
      ],
    },
    { id: 'st-2', position: 1, title: 'Constats', duration_seconds: 600, contents: [], questions: [], hints: [] },
  ],
}

function equipe(partiel: Partial<Equipe> & Pick<Equipe, 'id' | 'name'>): Equipe {
  return {
    session_id: 'se-1',
    join_code: '7KQ2MV',
    status: 'running',
    current_step: 0,
    step_started_at: '2026-10-12T09:00:00Z',
    step_deadline: '2026-10-12T09:05:00Z',
    remaining_on_pause_seconds: null,
    state_version: 3,
    created_at: '2026-10-12T08:00:00Z',
    ...partiel,
  }
}

const session: Session = {
  id: 'se-1',
  exercise_id: 'ex-1',
  title: 'Exercice du 12 octobre',
  status: 'running',
  snapshot: snapshotBrut as never,
  call_url: null,
  started_at: '2026-10-12T09:00:00Z',
  paused_at: null,
  ended_at: null,
  created_by: null,
  created_at: '2026-10-12T08:00:00Z',
}

function etat(partiel: Partial<EtatConsole> = {}): EtatConsole {
  return {
    session,
    equipes: [
      equipe({ id: 'eq-1', name: 'Équipe 1' }),
      equipe({ id: 'eq-2', name: 'Équipe 2', current_step: 1 }),
    ],
    snapshot: lireSnapshot(snapshotBrut),
    reponses: [],
    notes: [],
    messages: [],
    journal: [],
    connectes: { 'eq-1': 4, 'eq-2': 3 },
    ...partiel,
  }
}

function simuler(etatCourant: EtatConsole | null, extra: Record<string, unknown> = {}) {
  vi.mocked(useConsole).mockReturnValue({
    etat: etatCourant,
    decalageMs: 0,
    connexion: 'connecte',
    erreur: null,
    relire: vi.fn().mockResolvedValue(undefined),
    ...extra,
  } as ReturnType<typeof useConsole>)
}

function afficher() {
  return render(
    <MemoryRouter initialEntries={['/animateur/sessions/se-1/console']}>
      <Routes>
        <Route path="/animateur/sessions/:id/console" element={<Console />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('console animateur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'open').mockReturnValue(null)
  })

  it('affiche une carte par équipe avec son statut', () => {
    simuler(etat())
    afficher()
    // Le nom figure sur la carte et dans la barre d'actions de l'équipe choisie.
    expect(screen.getByRole('button', { name: /Équipe 1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Équipe 2/ })).toBeInTheDocument()
    // Médiane des étapes = 0,5 : l'équipe 1 est en retard, l'équipe 2 en avance.
    expect(screen.getByText('en retard')).toBeInTheDocument()
    expect(screen.getByText('en avance')).toBeInTheDocument()
  })

  it('signale les réponses à noter, globalement et par équipe', () => {
    simuler(
      etat({
        reponses: [{ team_id: 'eq-1', step_index: 0 } as never],
      }),
    )
    afficher()
    expect(screen.getByText('1 réponse à noter')).toBeInTheDocument()
    expect(screen.getByText('réponse à noter')).toBeInTheDocument()
  })

  it('ajoute et retire du temps à l’équipe sélectionnée', async () => {
    const utilisateur = userEvent.setup()
    simuler(etat())
    afficher()
    await utilisateur.click(screen.getByRole('button', { name: '+ 2 min' }))
    await waitFor(() => expect(ajouterTemps).toHaveBeenCalledWith('eq-1', 120))
    await utilisateur.click(screen.getByRole('button', { name: '− 1 min' }))
    await waitFor(() => expect(ajouterTemps).toHaveBeenCalledWith('eq-1', -60))
  })

  it('agit sur l’équipe choisie après changement de sélection', async () => {
    const utilisateur = userEvent.setup()
    simuler(etat())
    afficher()
    await utilisateur.click(screen.getByRole('button', { name: /Équipe 2/ }))
    await utilisateur.click(screen.getByRole('button', { name: '+ 2 min' }))
    await waitFor(() => expect(ajouterTemps).toHaveBeenCalledWith('eq-2', 120))
  })

  it('demande confirmation avant l’arrêt général', async () => {
    const utilisateur = userEvent.setup()
    simuler(etat())
    afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Arrêt général' }))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('ARRÊT GÉNÉRAL'))
    await waitFor(() => expect(arreter).toHaveBeenCalledWith('se-1'))
  })

  it('n’arrête pas si la confirmation est refusée', async () => {
    const utilisateur = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    simuler(etat())
    afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Arrêt général' }))
    expect(arreter).not.toHaveBeenCalled()
  })

  it('met la session en pause sans confirmation', async () => {
    const utilisateur = userEvent.setup()
    simuler(etat())
    afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Pause générale' }))
    await waitFor(() => expect(mettreEnPause).toHaveBeenCalledWith('se-1'))
  })

  it('propose « Reprendre » quand la session est en pause', () => {
    simuler(etat({ session: { ...session, status: 'paused' } }))
    afficher()
    expect(screen.getByRole('button', { name: 'Reprendre' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause générale' })).not.toBeInTheDocument()
  })

  it('diffuse un contenu manuel à l’équipe sélectionnée', async () => {
    const utilisateur = userEvent.setup()
    simuler(etat())
    afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Diffuser un contenu' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => expect(diffuser).toHaveBeenCalledWith('se-1', 'content', 'c-1', ['eq-1']))
  })

  it('permet de diffuser à toutes les équipes', async () => {
    const utilisateur = userEvent.setup()
    simuler(etat())
    afficher()
    await utilisateur.click(screen.getByRole('button', { name: 'Envoyer un indice' }))
    await utilisateur.click(screen.getByRole('checkbox'))
    await utilisateur.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => expect(diffuser).toHaveBeenCalledWith('se-1', 'hint', 'h-1', null))
  })

  it('montre la réponse type et le barème à la notation, et enregistre la note', async () => {
    const utilisateur = userEvent.setup()
    simuler(
      etat({
        reponses: [
          {
            team_id: 'eq-1',
            step_index: 0,
            question_id: 'q-1',
            content: { text: 'Nous isolons le réseau.' },
          } as never,
        ],
      }),
    )
    afficher()
    await utilisateur.click(screen.getByRole('button', { name: /^Noter/ }))

    expect(screen.getByText('Nous isolons le réseau.')).toBeInTheDocument()
    expect(screen.getByText('Isoler le réseau')).toBeInTheDocument()
    expect(screen.getByText(/3 pts par action/)).toBeInTheDocument()

    await utilisateur.type(screen.getByLabelText('Note de contenu (sur 8)'), '6')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer la note' }))
    await waitFor(() => expect(noter).toHaveBeenCalledWith('eq-1', 0, 6))
  })

  it('désactive la notation quand aucune réponse n’attend de note', () => {
    simuler(etat())
    afficher()
    expect(screen.getByRole('button', { name: /^Noter/ })).toBeDisabled()
  })

  it('affiche le journal en français', () => {
    simuler(
      etat({
        journal: [
          {
            id: 1,
            session_id: 'se-1',
            team_id: 'eq-1',
            actor_id: null,
            actor_kind: 'facilitator',
            type: 'hint_sent',
            payload: {},
            created_at: '2026-10-12T09:03:00Z',
          },
          {
            id: 2,
            session_id: 'se-1',
            team_id: null,
            actor_id: null,
            actor_kind: 'facilitator',
            type: 'session_started',
            payload: {},
            created_at: '2026-10-12T09:00:00Z',
          },
        ],
      }),
    )
    afficher()
    expect(screen.getByText('indice envoyé')).toBeInTheDocument()
    expect(screen.getByText('exercice démarré')).toBeInTheDocument()
    expect(screen.getByText('Toutes')).toBeInTheDocument()
  })
})
