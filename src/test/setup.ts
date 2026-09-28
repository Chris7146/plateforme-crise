import '@testing-library/jest-dom/vitest'

/**
 * Node 25 expose un `localStorage` natif expérimental qui prend le pas sur
 * celui de jsdom, sans fichier de stockage valide : il est incomplet
 * (`clear` absent) et son contenu fuit d'un test à l'autre.
 * On installe donc un stockage en mémoire, déterministe et isolé.
 */
function creerStockageMemoire(): Storage {
  const donnees = new Map<string, string>()
  return {
    get length() {
      return donnees.size
    },
    clear: () => donnees.clear(),
    getItem: (cle: string) => donnees.get(cle) ?? null,
    key: (index: number) => [...donnees.keys()][index] ?? null,
    removeItem: (cle: string) => void donnees.delete(cle),
    setItem: (cle: string, valeur: string) => void donnees.set(cle, String(valeur)),
  } as Storage
}

const stockage = creerStockageMemoire()
for (const cible of [globalThis, typeof window === 'undefined' ? null : window]) {
  if (cible) {
    Object.defineProperty(cible, 'localStorage', {
      value: stockage,
      writable: true,
      configurable: true,
    })
  }
}

/** `matchMedia` n'existe pas dans jsdom : stub minimal (aucune préférence active). */
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

/**
 * jsdom n'implémente pas le canvas et signale bruyamment chaque appel à
 * `getContext`. L'unique canvas de l'application est décoratif (pluie de
 * chiffres de l'accueil) : on renvoie null, le composant s'abstient alors.
 */
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
}
