import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const HomeScene = lazy(() => import('./pages/HomeScene'))
const SoccerScene = lazy(() => import('./pages/SoccerScene'))
const BasketballScene = lazy(() => import('./pages/BasketballScene'))
const VolleyballScene = lazy(() => import('./pages/VolleyballScene'))
const ContactScene = lazy(() => import('./pages/ContactScene'))
const ScrollJourneyPoc = lazy(() => import('./pages/ScrollJourneyPoc'))
// ビジュアル方向の比較用プロトタイプ(Issue #353 / #355 / #359)。現行シーンとは独立している
const ProtoA = lazy(() => import('./pages/ProtoA'))
const ProtoB = lazy(() => import('./pages/ProtoB'))
const ProtoC = lazy(() => import('./pages/ProtoC'))

export default function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomeScene />} />
        <Route path="/soccer" element={<SoccerScene />} />
        <Route path="/basketball" element={<BasketballScene />} />
        <Route path="/volleyball" element={<VolleyballScene />} />
        <Route path="/contact" element={<ContactScene />} />
        <Route path="/scroll-poc" element={<ScrollJourneyPoc />} />
        <Route path="/proto/a" element={<ProtoA />} />
        <Route path="/proto/b" element={<ProtoB />} />
        <Route path="/proto/c" element={<ProtoC />} />
      </Routes>
    </Suspense>
  )
}
