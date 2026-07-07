import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const HomeScene = lazy(() => import('./pages/HomeScene'))
const SoccerScene = lazy(() => import('./pages/SoccerScene'))
const BasketballScene = lazy(() => import('./pages/BasketballScene'))
const VolleyballScene = lazy(() => import('./pages/VolleyballScene'))
const ContactScene = lazy(() => import('./pages/ContactScene'))

export default function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomeScene />} />
        <Route path="/soccer" element={<SoccerScene />} />
        <Route path="/basketball" element={<BasketballScene />} />
        <Route path="/volleyball" element={<VolleyballScene />} />
        <Route path="/contact" element={<ContactScene />} />
      </Routes>
    </Suspense>
  )
}
