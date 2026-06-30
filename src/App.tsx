import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { LanguageProvider } from './contexts/LanguageContext'
import Scene from './components/canvas/Scene'
import Cursor from './components/ui/Cursor'
import Loader from './components/ui/Loader'
import Nav from './components/ui/Nav'
import Hero from './components/sections/Hero'
import JourneyZone from './components/sections/JourneyZone'
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
      {/*
        Canvas Layer — 右55%固定。alpha:false で transmission が正しく機能。
        mask-image で左端をフェードさせ、縦ラインを解消。
      */}
      <Canvas
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          zIndex: 0,
        }}
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* UI Layer */}
      <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none' }}>
        <Loader />
        <Cursor />
        <Nav />
        <main>
          <Hero />
          <JourneyZone id="journey-soccer" heightVh={250} />
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
