import { useUrlMedia } from '../../hooks/useUrlMedia'
import { lireContenus, type ContenuDiffuse } from '../../lib/contenus'

/**
 * Contenus diffusés à l'équipe (lot 3, maquette `participant.html`).
 * Un article est présenté en « faux média » : fond clair, typographie à
 * empattements, pour se distinguer nettement des écrans de travail.
 */
export function ContenusDiffuses({ contenus }: { contenus: unknown }) {
  const liste = lireContenus(contenus)
  if (liste.length === 0) return null

  return (
    <section className="flex flex-col gap-3" aria-label="Contenus diffusés">
      {liste.map((contenu) => (
        <Contenu key={contenu.id} contenu={contenu} />
      ))}
    </section>
  )
}

function Contenu({ contenu }: { contenu: ContenuDiffuse }) {
  if (contenu.type === 'article') return <Article contenu={contenu} />
  if (contenu.type === 'text') return <Texte contenu={contenu} />
  return <Media contenu={contenu} />
}

function Article({ contenu }: { contenu: ContenuDiffuse }) {
  return (
    <article className="rounded-lg bg-[#f3efe6] p-4 text-[#1f1d18]">
      <p className="border-b border-[#cfc8b6] pb-1.5 text-[11px] uppercase tracking-wide text-[#6b665a]">
        {contenu.title}
      </p>
      {contenu.body ? (
        <p className="mt-2 whitespace-pre-line font-serif text-[15px] leading-relaxed text-[#44413a]">
          {contenu.body}
        </p>
      ) : null}
    </article>
  )
}

function Texte({ contenu }: { contenu: ContenuDiffuse }) {
  return (
    <article className="rounded-lg border border-bordure bg-carte p-4">
      <h3 className="text-sm text-vert">{contenu.title}</h3>
      {contenu.body ? (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-texte">
          {contenu.body}
        </p>
      ) : null}
    </article>
  )
}

function Media({ contenu }: { contenu: ContenuDiffuse }) {
  const { url, erreur } = useUrlMedia(contenu.media_path)

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-bordure bg-carte p-4">
      <h3 className="text-sm text-vert">{contenu.title}</h3>
      {contenu.body ? (
        <p className="whitespace-pre-line text-sm text-secondaire">{contenu.body}</p>
      ) : null}

      {erreur ? (
        <p className="text-sm text-rouge">
          Ce document n’a pas pu être chargé. Signalez-le à l’animateur.
        </p>
      ) : !url ? (
        <p className="text-sm text-secondaire">Chargement du document…</p>
      ) : contenu.type === 'image' ? (
        <img src={url} alt={contenu.title} className="max-h-[60vh] w-full rounded object-contain" />
      ) : contenu.type === 'video' ? (
        <video src={url} controls className="w-full rounded" />
      ) : contenu.type === 'audio' ? (
        <audio src={url} controls className="w-full" />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-[44px] items-center text-bleu underline underline-offset-4"
        >
          Ouvrir le document
        </a>
      )}
    </article>
  )
}
