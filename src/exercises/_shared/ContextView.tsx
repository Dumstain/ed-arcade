/**
 * Render de ContextBlock (código, arreglo, pila, cadena de nodos, tabla, nota) — API CONGELADA.
 * Lo usan quiz, number, order y quien lo necesite. Solo lectura, sin interacción.
 * Orden de dibujo: código → arreglo → pila → cadena → tabla → nota.
 */
import type { ReactNode } from 'react'
import type { ArrayView, ChainView, ContextBlock, StackView, TableView, Val } from '../schemas'
import './contextview.css'

const show = (v: Val | null | undefined): string => (v === null || v === undefined ? '' : String(v))

/* ───────────────────────── Código Java con resaltado simple ───────────────────────── */
const KEYWORDS = new Set([
  'abstract', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'continue', 'default', 'do',
  'double', 'else', 'extends', 'false', 'final', 'finally', 'float', 'for', 'if', 'implements', 'import',
  'instanceof', 'int', 'interface', 'long', 'new', 'null', 'private', 'protected', 'public', 'return',
  'short', 'static', 'super', 'switch', 'this', 'throw', 'throws', 'true', 'try', 'void', 'while', 'var',
])
// grupos: 1 comentario · 2 cadena · 3 char · 4 número · 5 identificador
const TOKEN_RE = /(\/\/.*|\/\*.*?\*\/)|("(?:[^"\\]|\\.)*"?)|('(?:[^'\\]|\\.)*'?)|(\d+(?:\.\d+)?)|([A-Za-z_$][\w$]*)|([\s\S])/g

function highlightLine(line: string): ReactNode[] {
  const out: ReactNode[] = []
  let k = 0
  for (const m of line.matchAll(TOKEN_RE)) {
    const text = m[0]
    if (m[1]) out.push(<span key={k++} className="cv-tk-com">{text}</span>)
    else if (m[2] || m[3]) out.push(<span key={k++} className="cv-tk-str">{text}</span>)
    else if (m[4]) out.push(<span key={k++} className="cv-tk-num">{text}</span>)
    else if (m[5]) {
      if (KEYWORDS.has(text)) out.push(<span key={k++} className="cv-tk-kw">{text}</span>)
      else out.push(text)
    } else out.push(text)
  }
  return out
}

function CodeBlock({ code }: { code: string }) {
  const lines = String(code).replace(/\r\n?/g, '\n').replace(/\t/g, '  ').replace(/\s+$/, '').split('\n')
  const numbered = lines.length > 1
  return (
    <pre className="px-code cv-code" aria-label="Código en Java" tabIndex={0}>
      <code>
        {lines.map((ln, i) => (
          <span key={i} className="cv-line">
            {numbered && <span className="cv-ln" aria-hidden="true">{i + 1}</span>}
            {ln.length > 0 ? highlightLine(ln) : ' '}
          </span>
        ))}
      </code>
    </pre>
  )
}

/* ───────────────────────── Arreglo ───────────────────────── */
function ArrayBlock({ a }: { a: ArrayView }) {
  const values: (Val | null)[] = Array.isArray(a.values) ? a.values : []
  const n = values.length
  const showIndex = a.showIndex !== false
  const hl = new Set(Array.isArray(a.highlight) ? a.highlight : [])
  const dim = new Set(Array.isArray(a.dim) ? a.dim : [])

  // Flechitas: se permiten índices -1..n (inicio > fin) con una columna fantasma.
  const ptrs = new Map<number, { label: string; tone: number }[]>()
  let lo = 0
  let hi = n - 1
  ;(Array.isArray(a.pointers) ? a.pointers : []).forEach((p, tone) => {
    if (!p || !Number.isInteger(p.index) || p.index < -1 || p.index > n) return
    const list = ptrs.get(p.index) ?? []
    list.push({ label: String(p.label ?? ''), tone: tone % 4 })
    ptrs.set(p.index, list)
    lo = Math.min(lo, p.index)
    hi = Math.max(hi, p.index)
  })

  const cols: number[] = []
  for (let i = lo; i <= hi; i++) cols.push(i)

  const aria =
    `Arreglo${a.name ? ' ' + a.name : ''}: ` +
    values.map((v, i) => `posición ${i}: ${v === null ? 'vacía' : show(v)}`).join(', ') +
    (ptrs.size
      ? '. ' + [...ptrs.entries()].map(([i, l]) => `${l.map((x) => x.label).join(' y ')} en ${i}`).join(', ')
      : '')

  if (n === 0 && ptrs.size === 0) return <div className="cv-empty">arreglo vacío</div>

  return (
    <div className="cv-arr" role="img" aria-label={aria}>
      {a.name && <div className="cv-aname">{a.name}</div>}
      {cols.map((i) => {
        const ghost = i < 0 || i >= n
        const v = ghost ? null : values[i]
        const list = ptrs.get(i)
        return (
          <div className="cv-acol" key={i}>
            {ghost ? (
              <div className="cv-acell cv-acell--ghost" />
            ) : (
              <div
                className={
                  'px-cell cv-acell' +
                  (hl.has(i) ? ' is-hl' : '') +
                  (dim.has(i) ? ' is-dim' : '') +
                  (v === null || v === undefined ? ' is-empty' : '')
                }
              >
                {show(v)}
              </div>
            )}
            {showIndex && <div className="cv-aidx">{ghost ? ' ' : i}</div>}
            {list && (
              <div className={`cv-ptr cv-tone-${list[0].tone}`}>
                <i className="cv-arrow cv-arrow--up" />
                {list.map((p, j) => (
                  <span key={j} className={`cv-plabel cv-tone-${p.tone}`}>{p.label}</span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ───────────────────────── Pila (platos apilados) ───────────────────────── */
function StackBlock({ s }: { s: StackView }) {
  const vals: Val[] = Array.isArray(s.values) ? s.values : []
  const rows = [...vals].reverse() // el tope arriba
  const aria =
    `Pila${s.label ? ' ' + s.label : ''}, de abajo hacia arriba: ` +
    (vals.length ? vals.map(show).join(', ') + '. El tope es ' + show(vals[vals.length - 1]) : 'vacía')
  return (
    <figure className="cv-stack" role="img" aria-label={aria}>
      {s.label && <figcaption className="cv-cap">{s.label}</figcaption>}
      <div className="cv-stack-body">
        {vals.length === 0 && <div className="cv-plate cv-plate--empty">vacía</div>}
        {rows.map((v, r) => (
          <div key={vals.length - 1 - r} className={'cv-plate' + (r === 0 ? ' is-top' : '')}>
            <span className="cv-plate-val">{show(v)}</span>
            {r === 0 && (
              <span className="cv-tope">
                <i className="cv-arrow cv-arrow--left" />
                tope
              </span>
            )}
          </div>
        ))}
        <div className="cv-stack-base" />
      </div>
    </figure>
  )
}

/* ───────────────────────── Cadena de nodos [dato|sig] → … → null ───────────────────────── */
function Link() {
  return (
    <span className="cv-link" aria-hidden="true">
      <i className="cv-link-line" />
      <i className="cv-arrow cv-arrow--right" />
    </span>
  )
}

function ChainBlock({ c }: { c: ChainView }) {
  const vals: Val[] = Array.isArray(c.values) ? c.values : []
  const showNull = c.showNull !== false
  const aria =
    'Lista enlazada: ' + (c.head ? c.head + ', ' : '') + vals.map(show).join(' luego ') + (showNull ? ', luego null' : '')
  return (
    <div className="cv-chain" role="img" aria-label={aria}>
      {c.head && (
        <span className="cv-cunit">
          <span className="cv-head">{c.head}</span>
          {(vals.length > 0 || showNull) && <Link />}
        </span>
      )}
      {vals.map((v, i) => {
        const hasNext = i < vals.length - 1 || showNull
        return (
          <span className="cv-cunit" key={i}>
            <span className="cv-node">
              <span className="cv-ndata">{show(v)}</span>
              <span className="cv-nnext"><i className="cv-dot" /></span>
            </span>
            {hasNext && <Link />}
          </span>
        )
      })}
      {showNull && <span className="cv-null">null</span>}
    </div>
  )
}

/* ───────────────────────── Tabla ───────────────────────── */
function TableBlock({ t }: { t: TableView }) {
  const headers = Array.isArray(t.headers) ? t.headers : []
  const rows = Array.isArray(t.rows) ? t.rows : []
  return (
    <div className="cv-tablewrap">
      <table className="cv-table">
        {t.caption && <caption className="cv-cap">{t.caption}</caption>}
        {headers.length > 0 && (
          <thead>
            <tr>{headers.map((h, i) => <th key={i} scope="col">{show(h)}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {(Array.isArray(r) ? r : []).map((cell, j) => <td key={j}>{show(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ───────────────────────── Vista principal ───────────────────────── */
export function ContextView({ context }: { context?: ContextBlock }) {
  if (!context) return null
  const { code, array, stack, chain, table, note } = context
  const hasAny = !!(code || array || stack || chain || table || note)
  if (!hasAny) return null
  return (
    <div className="cv">
      {code ? <CodeBlock code={code} /> : null}
      {array ? <ArrayBlock a={array} /> : null}
      {stack ? <StackBlock s={stack} /> : null}
      {chain ? <ChainBlock c={chain} /> : null}
      {table ? <TableBlock t={table} /> : null}
      {note ? (
        <p className="cv-note">
          <span className="cv-note-icon" aria-hidden="true">!</span>
          <span>{note}</span>
        </p>
      ) : null}
    </div>
  )
}
export default ContextView
