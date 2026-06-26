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
      {/* Canvas Layer — 全画面・透過。球体は [0,0,0] で楕円ゼロ */}
      <Canvas
        style={{ position: 'fixed', inset: 0, zIndex: 0 }}
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>

      {/*
        左側グラデーションマスク — canvas の縦ラインを消して自然な背景とブレンド
        z-index 5 = Canvas(0) と UI(10) の間に挟む
      */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 5,
          pointerEvents: 'none',
          background:
            'linear-gradient(to right, #0a0a0f 0%, #0a0a0f 30%, rgba(10,10,15,0.45) 48%, transparent 60%)',
        }}
      />

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
