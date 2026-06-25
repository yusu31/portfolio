import { Canvas } from '@react-three/fiber'
import { LanguageProvider } from './contexts/LanguageContext'
import Scene from './components/canvas/Scene'
import Cursor from './components/ui/Cursor'
import Loader from './components/ui/Loader'
import Nav from './components/ui/Nav'
import Hero from './components/sections/Hero'
import Impact from './components/sections/Impact'
import Story from './components/sections/Story'
import Projects from './components/sections/Projects'
import Skills from './components/sections/Skills'
import Blog from './components/sections/Blog'
import Contact from './components/sections/Contact'
import Footer from './components/sections/Footer'

export default function App() {
  return (
    <LanguageProvider>
      {/* Canvas Layer */}
      <Canvas
        style={{ position: 'fixed', inset: 0, zIndex: 0 }}
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>

      {/* UI Layer */}
      <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none' }}>
        <Loader />
        <Cursor />
        <Nav />
        <main>
          <Hero />
          <Impact />
          <Story />
          <Projects />
          <Skills />
          <Blog />
          <Contact />
        </main>
        <Footer />
      </div>
    </LanguageProvider>
  )
}
