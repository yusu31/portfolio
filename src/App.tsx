// src/App.tsx
import { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { SceneContextProvider } from './contexts/SceneContext'
import AppRoutes from './router'
import Cursor from './components/ui/Cursor'
import Loader from './components/ui/Loader'
import GlobalNav from './components/ui/GlobalNav'
import RouteTransition from './components/ui/RouteTransition'
import GlobalCanvas from './components/canvas/GlobalCanvas'

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <SceneContextProvider>
          <GlobalCanvas />
          <Cursor />
          <Loader />
          <GlobalNav />
          <RouteTransition />
          <Suspense fallback={null}>
            <AppRoutes />
          </Suspense>
        </SceneContextProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
