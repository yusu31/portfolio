import { useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export type JourneyState =
  | 'idle'
  | 'dribble_1' | 'cut_1' | 'cut_2' | 'long_pass'
  | 'catch_wait' | 'shoot_rise' | 'apex' | 'drop' | 'through'
  | 'receive_wait' | 'receive' | 'toss' | 'spike'

const SEQUENCES: Record<string, JourneyState[]> = {
  '/soccer':     ['dribble_1', 'cut_1', 'cut_2', 'long_pass'],
  '/basketball': ['catch_wait', 'shoot_rise', 'apex', 'drop', 'through'],
  '/volleyball': ['receive_wait', 'receive', 'toss', 'spike'],
}

export function useSceneStateMachine() {
  const { pathname } = useLocation()
  const [stateIndex, setStateIndex] = useState(-1)

  const sequence = SEQUENCES[pathname] ?? []
  const currentState: JourneyState =
    stateIndex >= 0 && stateIndex < sequence.length ? sequence[stateIndex] : 'idle'
  const isAtEnd = sequence.length > 0 && stateIndex >= sequence.length - 1

  const advance = useCallback(() => {
    const seq = SEQUENCES[pathname] ?? []
    setStateIndex(prev => (prev < seq.length - 1 ? prev + 1 : prev))
  }, [pathname])

  const reset = useCallback(() => setStateIndex(-1), [])

  useEffect(() => {
    setStateIndex(-1)
  }, [pathname])

  return { currentState, stateIndex, isAtEnd, sequence, advance, reset }
}
