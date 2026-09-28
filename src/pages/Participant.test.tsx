import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Participant } from './Participant'
import type { VueEquipe } from '../lib/participant'

vi.mock('../lib/participant', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../lib/participant')>()
  return { ...reel, chargerVueEquipe: vi.fn() }
})

const { chargerVueEquipe } = await import('../lib/participant')

function vue(partiel: Partial<VueEquipe['team']> = {}, sessionStatut = 'running'): VueEquipe {
  return {
    server_now: '2026-10-12T09:00:00Z',
    session: { id: 'se-1', title: 'Exercice du 12 octobre', status: sessionStatut },
    team: {
      id: 'eq-1',
      name: 'Équipe 3',
      status: 'waiting',
      current_step: 0,
      step_count: 6,
      step_started_at: null,
      step_deadline: null,
      remaining_on_pause_seconds: null,
      state_version: 1,
      ...partiel,
    },
    participants: [{ name: 'Camille' }, { name: 'Dominique' }],
    messages: [],
    step: null,
  }
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
    vi.mocked(chargerVueEquipe).mockResolvedValue(vue())
  })

  it('attend le démarrage et liste les participants connectés', async () => {
    afficher()
    expect(await screen.findByText('En attente du démarrage par l’animateur.')).toBeInTheDocument()
    expect(screen.getByText('Équipe 3')).toBeInTheDocument()
    expect(screen.getByText('Participants connectés (2)')).toBeInTheDocument()
    expect(screen.getByText('Camille')).toBeInTheDocument()
  })

  it('bascule sur l’exercice en cours et annonce l’étape', async () => {
    vi.mocked(chargerVueEquipe).mockResolvedValue(vue({ status: 'running', current_step: 2 }))
    afficher()
    expect(await screen.findByText(/L’exercice a commencé — étape 3 sur 6\./)).toBeInTheDocument()
  })

  it('annonce la fin après un arrêt général', async () => {
    vi.mocked(chargerVueEquipe).mockResolvedValue(vue({ status: 'finished' }, 'stopped'))
    afficher()
    expect(await screen.findByText('L’exercice est terminé.')).toBeInTheDocument()
  })

  it('propose de revenir à l’accueil si l’équipe n’est plus accessible', async () => {
    vi.mocked(chargerVueEquipe).mockRejectedValue(new Error('Accès refusé'))
    afficher()
    expect(await screen.findByText('Accès refusé')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retour à l’accueil' })).toBeInTheDocument()
  })
})
