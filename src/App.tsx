// src/App.tsx
import { Suspense } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { SceneContextProvider } from './contexts/SceneContext'
import AppRoutes from './router'
import Cursor from './components/ui/Cursor'
import Loader from './components/ui/Loader'
import GlobalNav from './components/ui/GlobalNav'
import RouteTransition from './components/ui/RouteTransition'
import GlobalCanvas from './components/canvas/GlobalCanvas'

// Phase 1 POC (/scroll-poc) はゼロベースの独立ページとして検証するため、
// 既存の固定オーバーレイ(GlobalCanvas/Cursor/GlobalNav)は重ねない。
function LegacyChrome() {
  const location = useLocation()
  if (location.pathname === '/scroll-poc') return null

  return (
    <>
      <GlobalCanvas />
      <Cursor />
      <Loader />
      <GlobalNav />
      <RouteTransition />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <SceneContextProvider>
          <LegacyChrome />
          <Suspense fallback={null}>
            <AppRoutes />
          </Suspense>
        </SceneContextProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
