import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface SceneContextValue {
  activeHotspotId: string | null
  setActiveHotspotId: (id: string | null) => void
  visitedHotspotIds: Set<string>
  markVisited: (id: string) => void
  showFinale: boolean
  finaleHotspotCount: number
  setFinaleHotspotCount: (n: number) => void
  forceTarget: [number, number, number] | null
  setForceTarget: (pos: [number, number, number] | null) => void
  resetScene: () => void
}

const SceneContext = createContext<SceneContextValue>({
  activeHotspotId: null,
  setActiveHotspotId: () => {},
  visitedHotspotIds: new Set(),
  markVisited: () => {},
  showFinale: false,
  finaleHotspotCount: 0,
  setFinaleHotspotCount: () => {},
  forceTarget: null,
  setForceTarget: () => {},
  resetScene: () => {},
})

export function SceneContextProvider({ children }: { children: ReactNode }) {
  const [activeHotspotId, setActiveHotspotIdState] = useState<string | null>(null)
  const [visitedHotspotIds, setVisitedHotspotIds] = useState<Set<string>>(new Set())
  const [finaleHotspotCount, setFinaleHotspotCount] = useState(0)
  const [forceTarget, setForceTarget] = useState<[number, number, number] | null>(null)

  const showFinale = finaleHotspotCount > 0 && visitedHotspotIds.size >= finaleHotspotCount

  const setActiveHotspotId = useCallback((id: string | null) => {
    setActiveHotspotIdState(prev => prev === id ? prev : id)
  }, [])

  const markVisited = useCallback((id: string) => {
    setVisitedHotspotIds(prev => {
      if (prev.has(id)) return prev
      return new Set(prev).add(id)
    })
  }, [])

  const resetScene = useCallback(() => {
    setActiveHotspotIdState(null)
    setVisitedHotspotIds(new Set())
    setFinaleHotspotCount(0)
    setForceTarget(null)
  }, [])

  return (
    <SceneContext.Provider value={{
      activeHotspotId,
      setActiveHotspotId,
      visitedHotspotIds,
      markVisited,
      showFinale,
      finaleHotspotCount,
      setFinaleHotspotCount,
      forceTarget,
      setForceTarget,
      resetScene,
    }}>
      {children}
    </SceneContext.Provider>
  )
}

export function useSceneContext() {
  return useContext(SceneContext)
}
