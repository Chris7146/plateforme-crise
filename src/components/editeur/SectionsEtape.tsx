import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Badge, Bouton, Champ, Erreur, Modale, Selecteur, ZoneTexte } from '../ui'
import { ChampMedia } from './ChampMedia'
import {
  aBesoinOptions,
  chargerElements,
  enregistrerContenu,
  enregistrerIndice,
  enregistrerQuestion,
  estMedia,
  identifiantOption,
  libelleDeclenchement,
  libelleTypeContenu,
  libelleTypeQuestion,
  lireOptions,
  reordonnerElements,
  resumerAttendu,
  supprimerElement,
  TYPES_CONTENU,
  TYPES_QUESTION,
  validerQuestion,
  type Contenu,
  type ElementsEtape,
  type Indice,
  type ModeDeclenchement,
  type OptionQuestion,
  type Question,
  type TypeContenu,
  type TypeQuestion,
} from '../../lib/elements'
import { deplacer } from '../../lib/etapes'
import { typeContenuDepuisMime } from '../../lib/medias'
import type { Etape } from '../../lib/exercices'

type Edition =
  | { genre: 'contenu'; valeur: Contenu | null }
  | { genre: 'question'; valeur: Question | null }
  | { genre: 'indice'; valeur: Indice | null }

/** Contenus diffusés, questions et indices de l'étape sélectionnée (lot 1). */
export function SectionsEtape({ exerciceId, etape }: { exerciceId: string; etape: Etape }) {
  const [elements, setElements] = useState<ElementsEtape | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [edition, setEdition] = useState<Edition | null>(null)

  const recharger = useCallback(async () => {
    try {
      setElements(await chargerElements(etape.id))
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible.')
    }
  }, [etape.id])

  useEffect(() => {
    setElements(null)
    void recharger()
  }, [recharger])

  async function agir(action: () => Promise<void>) {
    setErreur(null)
    try {
      await action()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Opération impossible.')
    }
    await recharger()
  }

  function supprimer(table: 'contents' | 'questions' | 'hints', id: string, quoi: string) {
    if (!window.confirm(`Supprimer ${quoi} ?`)) return
    void agir(() => supprimerElement(table, id))
  }

  function deplacerElement<T extends { id: string }>(
    table: 'contents' | 'questions' | 'hints',
    liste: T[],
    index: number,
    sens: -1 | 1,
  ) {
    const cible = index + sens
    if (cible < 0 || cible >= liste.length) return
    void agir(() =>
      reordonnerElements(
        table,
        deplacer(liste, index, cible).map((e) => e.id),
      ),
    )
  }

  if (elements === null) {
    return <p className="text-xs text-secondaire">Chargement des éléments de l’étape…</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <Erreur>{erreur}</Erreur>

      <Section
        titre="contenus diffusés"
        vide="Aucun contenu. Vidéo, image, audio, document, article ou texte."
        onAjouter={() => setEdition({ genre: 'contenu', valeur: null })}
      >
        {elements.contenus.map((contenu, index) => (
          <LigneElement
            key={contenu.id}
            index={index}
            total={elements.contenus.length}
            onDeplacer={(sens) => deplacerElement('contents', elements.contenus, index, sens)}
            onModifier={() => setEdition({ genre: 'contenu', valeur: contenu })}
            onSupprimer={() =>
              supprimer('contents', contenu.id, `le contenu « ${contenu.title} »`)
            }
            badge={<Badge ton="neutre">{libelleTypeContenu(contenu.type)}</Badge>}
            titre={contenu.title}
            detail={libelleDeclenchement(contenu.trigger_mode, contenu.trigger_offset_seconds)}
            marqueVariante={contenu.source_id !== null && contenu.is_modified}
          />
        ))}
      </Section>

      <Section
        titre="questions"
        vide="Aucune question. Ouverte, choix unique, choix multiple ou oui/non."
        onAjouter={() => setEdition({ genre: 'question', valeur: null })}
      >
        {elements.questions.map((question, index) => (
          <LigneElement
            key={question.id}
            index={index}
            total={elements.questions.length}
            onDeplacer={(sens) => deplacerElement('questions', elements.questions, index, sens)}
            onModifier={() => setEdition({ genre: 'question', valeur: question })}
            onSupprimer={() => supprimer('questions', question.id, 'cette question')}
            badge={<Badge ton="neutre">{libelleTypeQuestion(question.type)}</Badge>}
            titre={question.prompt}
            detail={`${resumerAttendu(question)}${question.mandatory ? '' : ' · facultative'}`}
            marqueVariante={question.source_id !== null && question.is_modified}
          />
        ))}
      </Section>

      <Section
        titre="indices"
        vide="Aucun indice. Envoi automatique en T+ ou déclenché par l’animateur."
        onAjouter={() => setEdition({ genre: 'indice', valeur: null })}
      >
        {elements.indices.map((indice, index) => (
          <LigneElement
            key={indice.id}
            index={index}
            total={elements.indices.length}
            onDeplacer={(sens) => deplacerElement('hints', elements.indices, index, sens)}
            onModifier={() => setEdition({ genre: 'indice', valeur: indice })}
            onSupprimer={() => supprimer('hints', indice.id, 'cet indice')}
            badge={<Badge ton="attention">indice</Badge>}
            titre={indice.body}
            detail={libelleDeclenchement(indice.trigger_mode, indice.trigger_offset_seconds)}
            marqueVariante={indice.source_id !== null && indice.is_modified}
          />
        ))}
      </Section>

      {edition?.genre === 'contenu' ? (
        <FormulaireContenu
          exerciceId={exerciceId}
          etapeId={etape.id}
          position={elements.contenus.length}
          contenu={edition.valeur}
          onFermer={() => setEdition(null)}
          onEnregistre={() => {
            setEdition(null)
            void recharger()
          }}
        />
      ) : null}

      {edition?.genre === 'question' ? (
        <FormulaireQuestion
          etapeId={etape.id}
          position={elements.questions.length}
          question={edition.valeur}
          onFermer={() => setEdition(null)}
          onEnregistre={() => {
            setEdition(null)
            void recharger()
          }}
        />
      ) : null}

      {edition?.genre === 'indice' ? (
        <FormulaireIndice
          etapeId={etape.id}
          position={elements.indices.length}
          indice={edition.valeur}
          onFermer={() => setEdition(null)}
          onEnregistre={() => {
            setEdition(null)
            void recharger()
          }}
        />
      ) : null}
    </div>
  )
}

function Section({
  titre,
  vide,
  onAjouter,
  children,
}: {
  titre: string
  vide: string
  onAjouter: () => void
  children: ReactNode
}) {
  const liste = Array.isArray(children) ? children : [children]
  const estVide = liste.filter(Boolean).flat().length === 0

  return (
    <section className="rounded border border-bordure p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm text-secondaire">{titre}</h3>
        <Bouton variante="secondaire" onClick={onAjouter}>
          + Ajouter
        </Bouton>
      </div>
      {estVide ? (
        <p className="mt-2 text-xs text-secondaire">{vide}</p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-bordure/60">{children}</ul>
      )}
    </section>
  )
}

function LigneElement({
  index,
  total,
  badge,
  titre,
  detail,
  marqueVariante,
  onDeplacer,
  onModifier,
  onSupprimer,
}: {
  index: number
  total: number
  badge: ReactNode
  titre: string
  detail: string
  marqueVariante: boolean
  onDeplacer: (sens: -1 | 1) => void
  onModifier: () => void
  onSupprimer: () => void
}) {
  return (
    <li className="flex flex-wrap items-start gap-3 py-2">
      <span className="flex shrink-0 flex-col pt-1">
        <button
          type="button"
          onClick={() => onDeplacer(-1)}
          disabled={index === 0}
          aria-label={`Monter « ${titre} »`}
          className="px-1 text-secondaire hover:text-texte disabled:opacity-30"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => onDeplacer(1)}
          disabled={index === total - 1}
          aria-label={`Descendre « ${titre} »`}
          className="px-1 text-secondaire hover:text-texte disabled:opacity-30"
        >
          ▼
        </button>
      </span>
      <span className="shrink-0 pt-1">{badge}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-texte">{titre}</span>
        <span className="block text-xs text-secondaire">{detail}</span>
      </span>
      {marqueVariante ? <Badge ton="variante">modifié</Badge> : null}
      <span className="flex shrink-0 gap-2">
        <Bouton variante="secondaire" onClick={onModifier}>
          Modifier
        </Bouton>
        <Bouton variante="danger" onClick={onSupprimer}>
          Supprimer
        </Bouton>
      </span>
    </li>
  )
}

/** Réglage commun « auto en T+ n minutes » ou « manuel ». */
function ChampsDeclenchement({
  mode,
  minutes,
  onMode,
  onMinutes,
  aideAuto,
}: {
  mode: ModeDeclenchement
  minutes: string
  onMode: (mode: ModeDeclenchement) => void
  onMinutes: (minutes: string) => void
  aideAuto: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Selecteur
        label="Déclenchement"
        id="mode-declenchement"
        value={mode}
        onChange={(e) => onMode(e.target.value as ModeDeclenchement)}
      >
        <option value="auto">automatique, en T+</option>
        <option value="manual">manuel, depuis la console</option>
      </Selecteur>
      {mode === 'auto' ? (
        <Champ
          label="T+ (minutes après le début de l’étape)"
          id="offset-declenchement"
          type="number"
          min={0}
          max={60}
          value={minutes}
          onChange={(e) => onMinutes(e.target.value)}
        />
      ) : (
        <p className="self-end text-xs text-secondaire">{aideAuto}</p>
      )}
    </div>
  )
}

function minutesEnSecondes(saisie: string): number {
  const minutes = Number.parseInt(saisie, 10)
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 0
}

function FormulaireContenu({
  exerciceId,
  etapeId,
  position,
  contenu,
  onFermer,
  onEnregistre,
}: {
  exerciceId: string
  etapeId: string
  position: number
  contenu: Contenu | null
  onFermer: () => void
  onEnregistre: () => void
}) {
  const [type, setType] = useState<TypeContenu>(contenu?.type ?? 'article')
  const [titre, setTitre] = useState(contenu?.title ?? '')
  const [corps, setCorps] = useState(contenu?.body ?? '')
  const [chemin, setChemin] = useState<string | null>(contenu?.media_path ?? null)
  const [mode, setMode] = useState<ModeDeclenchement>(contenu?.trigger_mode ?? 'auto')
  const [minutes, setMinutes] = useState(
    String(Math.round((contenu?.trigger_offset_seconds ?? 0) / 60)),
  )
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    if (titre.trim().length === 0) {
      setErreur('Le titre du contenu est obligatoire.')
      return
    }
    if (estMedia(type) && !chemin) {
      setErreur('Choisissez un fichier pour ce type de contenu.')
      return
    }
    setEnCours(true)
    try {
      await enregistrerContenu({
        ...(contenu ? { id: contenu.id } : {}),
        step_id: etapeId,
        position: contenu?.position ?? position,
        type,
        title: titre.trim(),
        body: corps.trim() || null,
        media_path: estMedia(type) ? chemin : null,
        trigger_mode: mode,
        trigger_offset_seconds: mode === 'auto' ? minutesEnSecondes(minutes) : 0,
      })
      onEnregistre()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Enregistrement impossible.')
      setEnCours(false)
    }
  }

  return (
    <Modale titre={contenu ? 'Modifier le contenu' : 'Nouveau contenu'} onFermer={onFermer}>
      <form className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto" onSubmit={soumettre}>
        <Selecteur
          label="Type de contenu"
          id="type-contenu"
          value={type}
          onChange={(e) => setType(e.target.value as TypeContenu)}
        >
          {TYPES_CONTENU.map((valeur) => (
            <option key={valeur} value={valeur}>
              {libelleTypeContenu(valeur)}
            </option>
          ))}
        </Selecteur>

        <Champ
          label="Titre"
          id="titre-contenu"
          required
          maxLength={160}
          placeholder="Le Courrier de Valmont · flash info"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
        />

        {estMedia(type) ? (
          <ChampMedia
            label="Fichier"
            exerciceId={exerciceId}
            chemin={chemin}
            onChemin={setChemin}
            onFichierChoisi={(fichier) => setType(typeContenuDepuisMime(fichier.type))}
          />
        ) : null}

        <ZoneTexte
          label={type === 'article' ? 'Corps de l’article' : 'Texte affiché (facultatif)'}
          id="corps-contenu"
          rows={5}
          value={corps}
          onChange={(e) => setCorps(e.target.value)}
        />

        <ChampsDeclenchement
          mode={mode}
          minutes={minutes}
          onMode={setMode}
          onMinutes={setMinutes}
          aideAuto="Le contenu restera en attente : l’animateur le diffusera depuis la console."
        />

        <Erreur>{erreur}</Erreur>
        <div className="flex justify-end gap-3">
          <Bouton type="button" variante="secondaire" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enCours}>
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}

function FormulaireQuestion({
  etapeId,
  position,
  question,
  onFermer,
  onEnregistre,
}: {
  etapeId: string
  position: number
  question: Question | null
  onFermer: () => void
  onEnregistre: () => void
}) {
  const [type, setType] = useState<TypeQuestion>(question?.type ?? 'open')
  const [intitule, setIntitule] = useState(question?.prompt ?? '')
  const [options, setOptions] = useState<OptionQuestion[]>(
    lireOptions(question?.options).length > 0
      ? lireOptions(question?.options)
      : [
          { id: 'a', label: '' },
          { id: 'b', label: '' },
        ],
  )
  const [reponseType, setReponseType] = useState(
    typeof question?.expected_answer === 'string' ? question.expected_answer : '',
  )
  const [bareme, setBareme] = useState(question?.scoring_guide ?? '')
  const [obligatoire, setObligatoire] = useState(question?.mandatory ?? true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  function majOption(index: number, label: string) {
    setOptions((liste) => liste.map((o, i) => (i === index ? { ...o, label } : o)))
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    const probleme = validerQuestion(type, intitule, options)
    if (probleme) {
      setErreur(probleme)
      return
    }
    setEnCours(true)
    try {
      await enregistrerQuestion({
        ...(question ? { id: question.id } : {}),
        step_id: etapeId,
        position: question?.position ?? position,
        type,
        prompt: intitule.trim(),
        options: aBesoinOptions(type)
          ? options.filter((o) => o.label.trim().length > 0).map((o) => ({ ...o, label: o.label.trim() }))
          : [],
        expected_answer: reponseType.trim() || null,
        scoring_guide: bareme.trim() || null,
        mandatory: obligatoire,
      })
      onEnregistre()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Enregistrement impossible.')
      setEnCours(false)
    }
  }

  return (
    <Modale titre={question ? 'Modifier la question' : 'Nouvelle question'} onFermer={onFermer}>
      <form className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto" onSubmit={soumettre}>
        <Selecteur
          label="Type de question"
          id="type-question"
          value={type}
          onChange={(e) => setType(e.target.value as TypeQuestion)}
        >
          {TYPES_QUESTION.map((valeur) => (
            <option key={valeur} value={valeur}>
              {libelleTypeQuestion(valeur)}
            </option>
          ))}
        </Selecteur>

        <ZoneTexte
          label="Intitulé"
          id="intitule-question"
          rows={2}
          required
          value={intitule}
          onChange={(e) => setIntitule(e.target.value)}
        />

        {aBesoinOptions(type) ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm text-secondaire">Options proposées</span>
            {options.map((option, index) => (
              <Champ
                key={option.id}
                label={`Option ${option.id}`}
                id={`option-${option.id}`}
                maxLength={200}
                value={option.label}
                onChange={(e) => majOption(index, e.target.value)}
              />
            ))}
            <div className="flex gap-2">
              <Bouton
                type="button"
                variante="secondaire"
                onClick={() =>
                  setOptions((liste) => [
                    ...liste,
                    { id: identifiantOption(liste.length), label: '' },
                  ])
                }
              >
                + Option
              </Bouton>
              <Bouton
                type="button"
                variante="secondaire"
                disabled={options.length <= 2}
                onClick={() => setOptions((liste) => liste.slice(0, -1))}
              >
                − Option
              </Bouton>
            </div>
          </div>
        ) : null}

        <div className="rounded border border-bordure/60 bg-fond/40 p-3">
          <p className="mb-3 text-xs text-ambre">
            Réponse type et barème restent côté animateur : ils ne sont jamais transmis au
            navigateur des participants.
          </p>
          <div className="flex flex-col gap-3">
            <ZoneTexte
              label="Réponse type"
              id="reponse-type"
              rows={3}
              value={reponseType}
              onChange={(e) => setReponseType(e.target.value)}
            />
            <ZoneTexte
              label="Barème"
              id="bareme"
              rows={2}
              placeholder="3 décisions attendues · 10 pts"
              value={bareme}
              onChange={(e) => setBareme(e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={obligatoire}
            onChange={(e) => setObligatoire(e.target.checked)}
            className="h-5 w-5 accent-[#3ecf8e]"
          />
          Réponse obligatoire pour valider l’étape
        </label>

        <Erreur>{erreur}</Erreur>
        <div className="flex justify-end gap-3">
          <Bouton type="button" variante="secondaire" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enCours}>
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}

function FormulaireIndice({
  etapeId,
  position,
  indice,
  onFermer,
  onEnregistre,
}: {
  etapeId: string
  position: number
  indice: Indice | null
  onFermer: () => void
  onEnregistre: () => void
}) {
  const [corps, setCorps] = useState(indice?.body ?? '')
  const [mode, setMode] = useState<ModeDeclenchement>(indice?.trigger_mode ?? 'manual')
  const [minutes, setMinutes] = useState(
    String(Math.round((indice?.trigger_offset_seconds ?? 0) / 60)),
  )
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    if (corps.trim().length === 0) {
      setErreur('Le texte de l’indice est obligatoire.')
      return
    }
    setEnCours(true)
    try {
      await enregistrerIndice({
        ...(indice ? { id: indice.id } : {}),
        step_id: etapeId,
        position: indice?.position ?? position,
        body: corps.trim(),
        trigger_mode: mode,
        trigger_offset_seconds: mode === 'auto' ? minutesEnSecondes(minutes) : 0,
      })
      onEnregistre()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Enregistrement impossible.')
      setEnCours(false)
    }
  }

  return (
    <Modale titre={indice ? 'Modifier l’indice' : 'Nouvel indice'} onFermer={onFermer}>
      <form className="flex flex-col gap-4" onSubmit={soumettre}>
        <ZoneTexte
          label="Texte de l’indice"
          id="corps-indice"
          rows={3}
          required
          placeholder="Désigner un porte-parole"
          value={corps}
          onChange={(e) => setCorps(e.target.value)}
        />
        <ChampsDeclenchement
          mode={mode}
          minutes={minutes}
          onMode={setMode}
          onMinutes={setMinutes}
          aideAuto="L’animateur enverra cet indice aux équipes de son choix depuis la console."
        />
        <Erreur>{erreur}</Erreur>
        <div className="flex justify-end gap-3">
          <Bouton type="button" variante="secondaire" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enCours}>
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}
