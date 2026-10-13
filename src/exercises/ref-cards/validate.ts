import type { RefCardsData } from '../schemas'

/** Devuelve la lista de problemas del ejercicio (vacía = jugable). */
export function validate(d: RefCardsData | undefined): string[] {
  const p: string[] = []
  if (!d || typeof d !== 'object') return ['Faltan los datos del ejercicio.']
  const vars = Array.isArray(d.vars) ? d.vars : []
  const objects = Array.isArray(d.objects) ? d.objects : []
  const steps = Array.isArray(d.steps) ? d.steps : []
  if (vars.length === 0) p.push('vars está vacío.')
  if (objects.length === 0) p.push('objects está vacío.')
  if (steps.length === 0 && !d.finalQuestion) p.push('No hay pasos ni pregunta final.')

  const ids = new Set<string>()
  for (const o of objects) {
    if (!o || typeof o.id !== 'string') p.push('Un objeto no tiene id.')
    else if (ids.has(o.id)) p.push(`Objeto repetido: ${o.id}.`)
    else ids.add(o.id)
  }

  steps.forEach((s, i) => {
    const n = i + 1
    if (!s || typeof s.code !== 'string') {
      p.push(`Paso ${n}: falta code.`)
      return
    }
    if (!s.expect || typeof s.expect !== 'object') {
      p.push(`Paso ${n}: falta expect.`)
      return
    }
    for (const [v, t] of Object.entries(s.expect)) {
      if (!vars.includes(v)) p.push(`Paso ${n}: la variable «${v}» no está en vars.`)
      if (t === undefined || (t !== null && !ids.has(t))) p.push(`Paso ${n}: el objeto «${String(t)}» no existe.`)
    }
  })

  const q = d.finalQuestion
  if (q) {
    if (typeof q.text !== 'string' || !Array.isArray(q.choices) || q.choices.length < 2) p.push('finalQuestion necesita text y al menos 2 choices.')
    else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) p.push('finalQuestion.answer fuera de rango.')
  }
  return p
}
