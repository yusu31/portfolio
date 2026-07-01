import { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import AppRoutes from './router'
import Cursor from './components/ui/Cursor'
import Loader from './components/ui/Loader'
import GlobalNav from './components/ui/GlobalNav'
import RouteTransition from './components/ui/RouteTransition'

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <Cursor />
        <Loader />
        <GlobalNav />
        <RouteTransition />
        <Suspense fallback={null}>
          <AppRoutes />
        </Suspense>
      </LanguageProvider>
    </BrowserRouter>
  )
}
