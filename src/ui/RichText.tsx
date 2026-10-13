/**
 * Texto con información destacada. Marcado: **importante** → resaltado (clase .hl).
 * Seguro (no interpreta HTML). Úsalo para todo texto que venga del contenido:
 * prompt, hint, explanation, notas, explicaciones de pasos, opciones, fichas.
 */
const MARK = /(\*\*[^*]+?\*\*)/g

export function RichText({ text, className }: { text?: string | null; className?: string }) {
  if (text === null || text === undefined || text === '') return null
  const parts = String(text).split(MARK)
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.length > 4 && p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="hl">{p.slice(2, -2)}</strong>
        ) : (
          p
        ),
      )}
    </span>
  )
}

/** Quita el marcado ** (para aria-label, title, comparaciones de respuestas) */
export function plainText(text?: string | null): string {
  return String(text ?? '').replace(/\*\*([^*]+?)\*\*/g, '$1')
}

export default RichText
