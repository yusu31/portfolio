import { Routes, Route } from 'react-router-dom'
import HomeScene from './pages/HomeScene'
import SoccerScene from './pages/SoccerScene'
import BasketballScene from './pages/BasketballScene'
import VolleyballScene from './pages/VolleyballScene'
import ContactScene from './pages/ContactScene'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeScene />} />
      <Route path="/soccer" element={<SoccerScene />} />
      <Route path="/basketball" element={<BasketballScene />} />
      <Route path="/volleyball" element={<VolleyballScene />} />
      <Route path="/contact" element={<ContactScene />} />
    </Routes>
  )
}
