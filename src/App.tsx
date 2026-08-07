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

// Phase 1 POC (/scroll-poc)、Phase 6 のプロトタイプ (/proto/*)、リビルド本体 (/city) は
// ゼロベースの独立ページとして検証するため、既存の固定オーバーレイ
// (GlobalCanvas/Cursor/GlobalNav)は重ねない。
//
// 除外が必須。Loader は drei の useProgress が 100 に達したときだけ
// 消えるが、これらは非同期ロードする資源を持たないので progress が 0 のままになり、
// **ローダーが永久に画面を覆う**(実際にこれで最初のQAが真っ暗な絵になった)
const STANDALONE_ROUTES = ['/scroll-poc', '/city']

function LegacyChrome() {
  const location = useLocation()
  if (STANDALONE_ROUTES.includes(location.pathname) || location.pathname.startsWith('/proto/')) return null

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
