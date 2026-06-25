import { useLanguage } from '../../hooks/useLanguage'

export default function Hero() {
  const { t } = useLanguage()

  return (
    <section
      id="hero"
      style={{ pointerEvents: 'auto' }}
      className="min-h-screen flex flex-col justify-center px-6 md:px-16"
    >
      <span className="inline-block text-sm font-en font-semibold text-[var(--color-or2)] mb-4 tracking-wider uppercase">
        {t.hero_badge}
      </span>
      <h1 className="text-4xl md:text-6xl font-en font-extrabold text-[var(--color-tx)] leading-tight mb-6">
        yusu
      </h1>
      <p className="text-[var(--color-sub)] max-w-xl mb-8 whitespace-pre-line">
        {t.hero_sub}
      </p>
      <div className="flex gap-4 flex-wrap">
        <a
          href="#projects"
          className="px-6 py-3 rounded-full bg-[var(--color-or2)] text-white font-semibold hover:opacity-90 transition-opacity"
        >
          {t.hero_cta1}
        </a>
        <a
          href="#contact"
          className="px-6 py-3 rounded-full border border-[var(--color-bd)] text-[var(--color-tx)] font-semibold hover:border-[var(--color-or2)] transition-colors"
        >
          {t.hero_cta2}
        </a>
      </div>
    </section>
  )
}
