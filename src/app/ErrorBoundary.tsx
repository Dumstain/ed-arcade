import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Qué mostrar si algo truena; recibe el error y un reset */
  fallback: (error: Error, reset: () => void) => ReactNode
  /** Cambiar esta llave reinicia el boundary */
  resetKey?: string | number
}

interface State {
  error: Error | null
  key: string | number | undefined
}

/** Evita la pantalla en blanco si un ejercicio (u otra parte) truena en plena clase. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, key: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ED] Error de render', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) return this.props.fallback(this.state.error, this.reset)
    return this.props.children
  }
}
