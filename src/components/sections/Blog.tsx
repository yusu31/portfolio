import { useLanguage } from '../../hooks/useLanguage'

export default function Blog() {
  const { t } = useLanguage()

  return (
    <section
      id="blog"
      style={{ pointerEvents: 'auto' }}
      className="py-24 px-6 md:px-16"
    >
      <h2 className="text-3xl md:text-5xl font-en font-extrabold text-[var(--color-tx)] mb-4">
        {t.blog_h}
      </h2>
      <p className="text-[var(--color-sub)] mb-16 max-w-xl">{t.blog_desc}</p>
      <div className="border border-dashed border-[var(--color-bd)] rounded-2xl p-12 text-center">
        <p className="font-en font-bold text-xl text-[var(--color-tx)] mb-2">{t.blog_soon_title}</p>
        <p className="text-[var(--color-sub)] whitespace-pre-line">{t.blog_soon_desc}</p>
      </div>
    </section>
  )
}
