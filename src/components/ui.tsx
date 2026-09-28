import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

/** Composants primitifs au thème « terminal de crise ». Cibles tactiles ≥ 44 px. */

type VarianteBouton = 'primaire' | 'secondaire' | 'danger'

const stylesBouton: Record<VarianteBouton, string> = {
  primaire: 'bg-vert/15 text-vert border-vert/50 hover:bg-vert/25',
  secondaire: 'bg-transparent text-texte border-bordure hover:bg-carte',
  danger: 'bg-rouge/15 text-rouge border-rouge/50 hover:bg-rouge/25',
}

const socleBouton =
  'inline-flex min-h-[44px] items-center justify-center rounded border px-4 py-2 font-mono text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40'

interface BoutonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBouton
}

export function Bouton({ variante = 'primaire', className = '', ...props }: BoutonProps) {
  return <button {...props} className={`${socleBouton} ${stylesBouton[variante]} ${className}`} />
}

/** Lien de navigation présenté comme un bouton (même cible tactile). */
export function LienBouton({
  to,
  variante = 'secondaire',
  className = '',
  children,
}: {
  to: string
  variante?: VarianteBouton
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={`${socleBouton} ${stylesBouton[variante]} ${className}`}>
      {children}
    </Link>
  )
}

export function Carte({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-lg border border-bordure bg-carte p-6 ${className}`}>{children}</div>
  )
}

const styleSaisie =
  'rounded border border-bordure bg-fond px-3 py-2 text-texte placeholder:text-secondaire/60 focus:border-bleu focus:outline-none'

interface ChampProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Champ({ label, id, className = '', ...props }: ChampProps) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="text-secondaire">{label}</span>
      <input id={id} {...props} className={`min-h-[44px] ${styleSaisie} ${className}`} />
    </label>
  )
}

interface ZoneTexteProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function ZoneTexte({ label, id, className = '', ...props }: ZoneTexteProps) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="text-secondaire">{label}</span>
      <textarea id={id} {...props} className={`${styleSaisie} ${className}`} />
    </label>
  )
}

interface SelecteurProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
}

export function Selecteur({ label, id, className = '', children, ...props }: SelecteurProps) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="text-secondaire">{label}</span>
      <select id={id} {...props} className={`min-h-[44px] ${styleSaisie} ${className}`}>
        {children}
      </select>
    </label>
  )
}

type TonBadge = 'modele' | 'variante' | 'neutre' | 'attention'

const stylesBadge: Record<TonBadge, string> = {
  modele: 'border-bordure bg-bordure/40 text-secondaire',
  variante: 'border-bleu/40 bg-bleu/10 text-bleu',
  neutre: 'border-bordure bg-carte text-secondaire',
  attention: 'border-ambre/40 bg-ambre/10 text-ambre',
}

/** Badge « modèle » / « variante » (voir maquette `editeur-etapes.html`). */
export function Badge({ ton = 'neutre', children }: { ton?: TonBadge; children: ReactNode }) {
  return (
    <span
      className={`whitespace-nowrap rounded border px-2 py-0.5 text-xs font-mono ${stylesBadge[ton]}`}
    >
      {children}
    </span>
  )
}

/** Message d'erreur en rouge, lu par les lecteurs d'écran dès son apparition. */
export function Erreur({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="text-sm text-rouge">
      {children}
    </p>
  )
}

/**
 * Fenêtre modale sobre : fermeture par Échap ou clic sur le fond,
 * focus placé sur le premier champ à l'ouverture.
 */
export function Modale({
  titre,
  onFermer,
  children,
}: {
  titre: string
  onFermer: () => void
  children: ReactNode
}) {
  const conteneur = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', surTouche)
    conteneur.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus()
    return () => document.removeEventListener('keydown', surTouche)
  }, [onFermer])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onFermer}
    >
      <div
        ref={conteneur}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-bordure bg-carte p-6"
      >
        <h2 className="mb-4 text-lg text-vert">{titre}</h2>
        {children}
      </div>
    </div>
  )
}
