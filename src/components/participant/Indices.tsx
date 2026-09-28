/** Indices reçus par l'équipe (auto en T+ ou envoyés par l'animateur). */
export function Indices({ indices }: { indices: { id: string; body: string }[] }) {
  if (indices.length === 0) return null

  return (
    <section className="flex flex-col gap-2" aria-label="Indices reçus">
      {indices.map((indice) => (
        <div
          key={indice.id}
          className="rounded-lg border border-ambre/40 bg-ambre/10 p-3"
          role="status"
        >
          <p className="text-xs text-ambre">indice reçu</p>
          <p className="mt-1 text-sm text-[#e8d6ad]">{indice.body}</p>
        </div>
      ))}
    </section>
  )
}
