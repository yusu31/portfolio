import { useLanguage } from '../../hooks/useLanguage'

export default function Nav() {
  const { t, lang, toggleLang } = useLanguage()

  return (
    <nav
      style={{ pointerEvents: 'auto' }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
    >
      <a href="#" className="font-en font-bold text-lg text-[var(--color-tx)]">
        yusu
      </a>
      <ul className="hidden md:flex gap-6 text-sm text-[var(--color-sub)]">
        {(['nav_impact', 'nav_story', 'nav_works', 'nav_blog', 'nav_contact'] as const).map(
          (key, i) => {
            const anchors = ['#impact', '#story', '#projects', '#blog', '#contact']
            return (
              <li key={key}>
                <a href={anchors[i]} className="hover:text-[var(--color-or)] transition-colors">
                  {t[key]}
                </a>
              </li>
            )
          }
        )}
      </ul>
      <button
        onClick={toggleLang}
        className="text-sm font-en font-semibold text-[var(--color-or2)] hover:opacity-70 transition-opacity"
      >
        {lang === 'ja' ? 'EN' : 'JP'}
      </button>
    </nav>
  )
}
