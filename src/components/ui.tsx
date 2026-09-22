import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/** Composants primitifs au thème « terminal de crise ». Cibles tactiles ≥ 44 px. */

type VarianteBouton = 'primaire' | 'secondaire' | 'danger'

const stylesBouton: Record<VarianteBouton, string> = {
  primaire: 'bg-vert/15 text-vert border-vert/50 hover:bg-vert/25',
  secondaire: 'bg-transparent text-texte border-bordure hover:bg-carte',
  danger: 'bg-rouge/15 text-rouge border-rouge/50 hover:bg-rouge/25',
}

interface BoutonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBouton
}

export function Bouton({ variante = 'primaire', className = '', ...props }: BoutonProps) {
  return (
    <button
      {...props}
      className={`min-h-[44px] rounded border px-4 py-2 font-mono text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${stylesBouton[variante]} ${className}`}
    />
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

interface ChampProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function Champ({ label, id, className = '', ...props }: ChampProps) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="text-secondaire">{label}</span>
      <input
        id={id}
        {...props}
        className={`min-h-[44px] rounded border border-bordure bg-fond px-3 py-2 text-texte placeholder:text-secondaire/60 focus:border-bleu ${className}`}
      />
    </label>
  )
}
