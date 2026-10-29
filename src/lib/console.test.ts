import { describe, expect, it } from 'vitest'
import {
  etapesANoter,
  indiceDejaDiffuse,
  itemsDiffusables,
  libelleDeclenchementIndice,
  libelleEvenement,
  libelleStatutEquipe,
  lireSnapshot,
  medianeEtapes,
  messagesNonLus,
  reponseRouvrable,
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
        { id: 'h-2', body: 'Prévenir l’ARS', trigger_mode: 'auto', trigger_offset_seconds: 240 },
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

describe('itemsDiffusables', () => {
  it('ne retient que les contenus à déclenchement manuel, et tous les indices', () => {
    const snapshot = lireSnapshot(snapshotBrut)
    const { contenus, indices } = itemsDiffusables(snapshot, 0)
    expect(contenus.map((c) => c.id)).toEqual(['c-1'])
    expect(indices.map((h) => h.id)).toEqual(['h-1', 'h-2'])
  })

  it('renvoie des listes vides hors des étapes connues', () => {
    expect(itemsDiffusables(lireSnapshot(snapshotBrut), 5)).toEqual({ contenus: [], indices: [] })
    expect(itemsDiffusables(null, 0)).toEqual({ contenus: [], indices: [] })
  })
})

describe('indiceDejaDiffuse', () => {
  const manuel = { id: 'h-1', trigger_mode: 'manual' as const, trigger_offset_seconds: 0 }
  const auto = { id: 'h-2', trigger_mode: 'auto' as const, trigger_offset_seconds: 240 }
  const debut = '2026-10-29T14:00:00Z'
  const maintenant = Date.parse('2026-10-29T14:01:00Z') // T+60 s

  it('reconnaît un indice déjà envoyé, quel que soit son mode', () => {
    expect(indiceDejaDiffuse(manuel, { stepStartedAt: debut, pausedAt: null, diffuses: ['h-1'] }, maintenant)).toBe(true)
    expect(indiceDejaDiffuse(auto, { stepStartedAt: debut, pausedAt: null, diffuses: ['h-2'] }, maintenant)).toBe(true)
  })

  it('laisse un indice manuel non envoyé disponible', () => {
    expect(indiceDejaDiffuse(manuel, { stepStartedAt: debut, pausedAt: null, diffuses: [] }, maintenant)).toBe(false)
  })

  it('tient compte du T+ d’un indice automatique', () => {
    const contexte = { stepStartedAt: debut, pausedAt: null, diffuses: [] }
    expect(indiceDejaDiffuse(auto, contexte, maintenant)).toBe(false)
    expect(indiceDejaDiffuse(auto, contexte, Date.parse('2026-10-29T14:04:00Z'))).toBe(true)
  })

  it('fige le temps écoulé pendant une pause, comme le serveur', () => {
    const enPause = { stepStartedAt: debut, pausedAt: '2026-10-29T14:01:00Z', diffuses: [] }
    expect(indiceDejaDiffuse(auto, enPause, Date.parse('2026-10-29T14:30:00Z'))).toBe(false)
  })

  it('ne conclut rien tant que l’étape n’a pas commencé', () => {
    expect(indiceDejaDiffuse(auto, { stepStartedAt: null, pausedAt: null }, maintenant)).toBe(false)
  })
})

describe('libelleDeclenchementIndice', () => {
  it('annonce le déclenchement automatique et l’effet d’un envoi immédiat', () => {
    expect(libelleDeclenchementIndice({ trigger_mode: 'auto', trigger_offset_seconds: 240 })).toBe(
      'se déclenche seul à T+4 min · l’envoyer maintenant le diffuse tout de suite',
    )
  })

  it('reste sobre pour un indice manuel', () => {
    expect(libelleDeclenchementIndice({ trigger_mode: 'manual', trigger_offset_seconds: 0 })).toBe(
      'envoi manuel',
    )
  })
})

describe('reponseRouvrable', () => {
  const reponses = [{ team_id: 'eq-1', step_index: 2 }]

  it('autorise la réouverture de l’étape courante d’une équipe en jeu', () => {
    expect(reponseRouvrable({ id: 'eq-1', status: 'running', current_step: 2 }, reponses)).toBe(true)
    expect(reponseRouvrable({ id: 'eq-1', status: 'time_up', current_step: 2 }, reponses)).toBe(true)
  })

  it('refuse une étape déjà quittée ou une équipe hors jeu', () => {
    expect(reponseRouvrable({ id: 'eq-1', status: 'running', current_step: 3 }, reponses)).toBe(false)
    expect(reponseRouvrable({ id: 'eq-1', status: 'finished', current_step: 2 }, reponses)).toBe(false)
    expect(reponseRouvrable({ id: 'eq-2', status: 'running', current_step: 2 }, reponses)).toBe(false)
  })

  it('refuse quand l’équipe n’a rien validé', () => {
    expect(reponseRouvrable({ id: 'eq-1', status: 'running', current_step: 2 }, [])).toBe(false)
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
    // Le type écrit par la base est bien `step_started` (voir _advance()).
    expect(libelleEvenement({ type: 'step_started', payload: { step_index: 2 } })).toBe(
      'passage à l’étape 3',
    )
    expect(libelleEvenement({ type: 'time_changed', payload: { seconds: 120 } })).toBe('+ 2 min')
    expect(libelleEvenement({ type: 'time_changed', payload: { seconds: -60 } })).toBe('− 1 min')
    expect(libelleEvenement({ type: 'answers_scored', payload: { content_score: 6 } })).toBe(
      'note attribuée : 6',
    )
    expect(libelleEvenement({ type: 'answers_reopened', payload: { step_index: 7 } })).toBe(
      'réponse rouverte (étape 8)',
    )
    expect(
      libelleEvenement({ type: 'participant_joined', payload: { display_name: 'Camille' } }),
    ).toBe('Camille a rejoint')
  })

  it('distingue les deux modes de diffusion d’un indice et son ouverture', () => {
    expect(libelleEvenement({ type: 'hint_sent', payload: { trigger_mode: 'manual' } })).toBe(
      'indice envoyé',
    )
    expect(libelleEvenement({ type: 'hint_sent', payload: { trigger_mode: 'auto' } })).toBe(
      'indice diffusé (automatique)',
    )
    expect(
      libelleEvenement({ type: 'hint_opened', payload: { delay_seconds: 42, step_index: 1 } }),
    ).toBe('indice ouvert')
  })

  it('retombe sur le type brut pour un événement inconnu', () => {
    expect(libelleEvenement({ type: 'chose_nouvelle', payload: {} })).toBe('chose_nouvelle')
  })
})
