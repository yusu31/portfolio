import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Lang, Translations } from '../types'
import { translations } from '../i18n/translations'

interface LanguageContextValue {
  lang: Lang
  t: Translations
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ja')
  const toggleLang = useCallback(() => setLang((p) => (p === 'ja' ? 'en' : 'ja')), [])

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
