import { useLanguage } from '../../hooks/useLanguage'

const timeline = [
  { year: '2016', ja: '体育教師として採用。部活動・授業・生活指導に没頭。', en: 'Hired as a PE teacher. Immersed in coaching, classes, and student support.' },
  { year: '2022', ja: '指導案作成の非効率さに限界を感じ、独学でプログラミングを開始。', en: 'Frustrated by inefficient lesson planning — started learning to code on my own.' },
  { year: '2023', ja: 'TAIIKU BASEを個人開発。10名のテストで作成時間80%削減を実証。', en: 'Built TAIIKU BASE solo. Proved 80% time reduction across 10 test users.' },
  { year: '2024', ja: 'RaiseTechでフルスタック開発を体系的に学習。エラー翻訳くんをChrome Storeに公開。', en: 'Studied full-stack development at RaiseTech. Published Error Translator on Chrome Store.' },
  { year: '2025', ja: 'エンジニアとしてのキャリアへ本格転換。ポートフォリオv2構築中。', en: 'Full pivot to an engineering career. Building portfolio v2.' },
]

export default function Story() {
  const { t, lang } = useLanguage()

  return (
    <section
      id="story"
      style={{ pointerEvents: 'auto' }}
      className="py-24 px-6 md:px-16"
    >
      <h2
        className="text-3xl md:text-5xl font-en font-extrabold text-[var(--color-tx)] mb-4 whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: t.story_h.replace('\n', '<br/>') }}
      />
      <p className="text-[var(--color-sub)] mb-16 max-w-xl">{t.story_desc}</p>
      <div className="relative pl-8 border-l-2 border-[var(--color-bd)] flex flex-col gap-10">
        {timeline.map((item) => (
          <div key={item.year} className="tl-item">
            <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[var(--color-or2)] border-2 border-[var(--color-cream)]" />
            <p className="text-xs font-en font-semibold text-[var(--color-or2)] mb-1">{item.year}</p>
            <p className="text-[var(--color-tx)]">{lang === 'ja' ? item.ja : item.en}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
