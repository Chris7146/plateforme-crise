import { describe, expect, it } from 'vitest'
import {
  etapesANoter,
  itemsManuels,
  libelleEvenement,
  libelleStatutEquipe,
  lireSnapshot,
  medianeEtapes,
  messagesNonLus,
  statutEquipe,
  tonStatutEquipe,
  type Message,
} from './console'

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
      ambient_audio_path: null,
      contents: [
        {
          id: 'c-1',
          type: 'article',
          title: 'Flash info',
          body: 'Texte',
          media_path: null,
          trigger_mode: 'manual',
          trigger_offset_seconds: 0,
        },
        {
          id: 'c-2',
          type: 'text',
          title: 'Appel du standard',
          body: null,
          media_path: null,
          trigger_mode: 'auto',
          trigger_offset_seconds: 0,
        },
      ],
      questions: [
        {
          id: 'q-1',
          type: 'open',
          prompt: 'Vos trois premières actions ?',
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
  ],
}

describe('lireSnapshot', () => {
  it('lit l’exercice, les étapes et leurs éléments', () => {
    const snapshot = lireSnapshot(snapshotBrut)
    expect(snapshot?.exercice.title).toBe('Cyberattaque')
    expect(snapshot?.etapes).toHaveLength(1)
    expect(snapshot?.etapes[0].contents).toHaveLength(2)
    expect(snapshot?.etapes[0].hints[0].body).toBe('Vérifier le SIH')
  })

  it('conserve réponse type et barème, destinés à l’animateur seul', () => {
    const question = lireSnapshot(snapshotBrut)?.etapes[0].questions[0]
    expect(question?.expected_answer).toBe('Isoler le réseau')
    expect(question?.scoring_guide).toBe('3 pts par action')
  })

  it('renvoie null pour un snapshot absent et tolère un contenu mal formé', () => {
    expect(lireSnapshot(null)).toBeNull()
    expect(lireSnapshot({ steps: [null, 42] })?.etapes).toEqual([])
    expect(lireSnapshot({})?.exercice.max_content_score).toBe(8)
  })
})

describe('itemsManuels', () => {
  it('ne retient que les contenus à déclenchement manuel, et tous les indices', () => {
    const snapshot = lireSnapshot(snapshotBrut)
    const { contenus, indices } = itemsManuels(snapshot, 0)
    expect(contenus.map((c) => c.id)).toEqual(['c-1'])
    expect(indices.map((h) => h.id)).toEqual(['h-1'])
  })

  it('renvoie des listes vides hors des étapes connues', () => {
    expect(itemsManuels(lireSnapshot(snapshotBrut), 5)).toEqual({ contenus: [], indices: [] })
    expect(itemsManuels(null, 0)).toEqual({ contenus: [], indices: [] })
  })
})

describe('medianeEtapes', () => {
  it('calcule la médiane des étapes atteintes', () => {
    expect(medianeEtapes([{ current_step: 1 }, { current_step: 3 }, { current_step: 2 }])).toBe(2)
    expect(medianeEtapes([{ current_step: 2 }, { current_step: 4 }])).toBe(3)
    expect(medianeEtapes([])).toBe(0)
  })
})

describe('statutEquipe', () => {
  const sansAction = { mediane: 2, aReponseANoter: false }

  it('compare l’avancement à la médiane du groupe', () => {
    expect(statutEquipe({ status: 'running', current_step: 2 }, sansAction)).toBe('a_l_heure')
    expect(statutEquipe({ status: 'running', current_step: 1 }, sansAction)).toBe('en_retard')
    expect(statutEquipe({ status: 'running', current_step: 3 }, sansAction)).toBe('en_avance')
  })

  it('fait primer ce qui demande une action de l’animateur', () => {
    expect(
      statutEquipe({ status: 'running', current_step: 1 }, { mediane: 2, aReponseANoter: true }),
    ).toBe('a_noter')
    expect(statutEquipe({ status: 'time_up', current_step: 2 }, sansAction)).toBe('temps_ecoule')
  })

  it('reconnaît l’attente et la fin', () => {
    expect(statutEquipe({ status: 'waiting', current_step: 0 }, sansAction)).toBe('en_attente')
    expect(
      statutEquipe({ status: 'finished', current_step: 5 }, { mediane: 2, aReponseANoter: true }),
    ).toBe('terminee')
  })

  it('associe un libellé et une couleur à chaque statut', () => {
    expect(libelleStatutEquipe('a_l_heure')).toBe('à l’heure')
    expect(tonStatutEquipe('en_retard')).toBe('rouge')
    expect(tonStatutEquipe('a_noter')).toBe('ambre')
    expect(tonStatutEquipe('en_avance')).toBe('bleu')
  })
})

describe('etapesANoter', () => {
  const reponses = [
    { team_id: 'eq-1', step_index: 0 },
    { team_id: 'eq-1', step_index: 1 },
    { team_id: 'eq-2', step_index: 0 },
  ]

  it('liste les étapes répondues et non encore notées', () => {
    const notes = [{ team_id: 'eq-1', step_index: 0, content_score: 6 }]
    expect(etapesANoter('eq-1', reponses, notes)).toEqual([1])
    expect(etapesANoter('eq-2', reponses, notes)).toEqual([0])
  })

  it('considère une note absente comme non attribuée', () => {
    // submit_answers() crée une ligne scores pour le bonus de temps, sans note de contenu.
    const notes = [{ team_id: 'eq-1', step_index: 0, content_score: null }]
    expect(etapesANoter('eq-1', reponses, notes)).toEqual([0, 1])
  })

  it('ne mélange pas les équipes', () => {
    expect(etapesANoter('eq-3', reponses, [])).toEqual([])
  })
})

describe('messagesNonLus', () => {
  function message(partiel: Partial<Message>): Message {
    return {
      id: 'm-1',
      session_id: 'se-1',
      team_id: 'eq-1',
      from_staff: false,
      author_id: null,
      body: 'Question',
      created_at: '2026-10-12T09:00:00Z',
      read_at: null,
      ...partiel,
    }
  }

  it('ne compte que les messages des participants non encore lus', () => {
    const messages = [
      message({ id: 'm-1' }),
      message({ id: 'm-2', read_at: '2026-10-12T09:01:00Z' }),
      message({ id: 'm-3', from_staff: true }),
      message({ id: 'm-4', team_id: 'eq-2' }),
    ]
    expect(messagesNonLus('eq-1', messages)).toBe(1)
    expect(messagesNonLus('eq-2', messages)).toBe(1)
  })
})

describe('libelleEvenement', () => {
  it('résume les événements du journal en français', () => {
    expect(libelleEvenement({ type: 'session_started', payload: {} })).toBe('exercice démarré')
    expect(libelleEvenement({ type: 'step_advanced', payload: { step_index: 2 } })).toBe(
      'passage à l’étape 3',
    )
    expect(libelleEvenement({ type: 'time_changed', payload: { seconds: 120 } })).toBe('+ 2 min')
    expect(libelleEvenement({ type: 'time_changed', payload: { seconds: -60 } })).toBe('− 1 min')
    expect(libelleEvenement({ type: 'answers_scored', payload: { content_score: 6 } })).toBe(
      'note attribuée : 6',
    )
    expect(
      libelleEvenement({ type: 'participant_joined', payload: { display_name: 'Camille' } }),
    ).toBe('Camille a rejoint')
  })

  it('retombe sur le type brut pour un événement inconnu', () => {
    expect(libelleEvenement({ type: 'chose_nouvelle', payload: {} })).toBe('chose_nouvelle')
  })
})
