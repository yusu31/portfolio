import { useLanguage } from '../../hooks/useLanguage'

const stats = [
  { num: '7+', key: 'imp1_desc' as const },
  { num: '3',  key: 'imp2_desc' as const },
  { num: '80%', key: 'imp3_desc' as const },
  { num: '2h+', key: 'imp4_desc' as const },
]

export default function Impact() {
  const { t } = useLanguage()

  return (
    <section
      id="impact"
      style={{ pointerEvents: 'auto' }}
      className="py-24 px-6 md:px-16"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map(({ num, key }) => (
          <div key={key} className="impact-card text-center">
            <p className="text-4xl font-en font-extrabold text-[var(--color-or2)] mb-2">{num}</p>
            <p className="text-sm text-[var(--color-sub)]">{t[key]}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
