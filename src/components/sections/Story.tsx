import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLanguage } from '../../hooks/useLanguage'

const TL_ITEMS = [
  {
    period: { ja: '\u{301C}2024 / 体育教師時代', en: '~2024 / PE Teacher Era' },
    title: { ja: '10年間、生徒の成長を設計してきた。', en: 'Ten years designing students’ growth.' },
    body: {
      ja: '授業計画・選手育成・リスク管理——体育教師の仕事は退屈な課題のなかで判断・展開する繰り返しだった。「依頼される人がいる設計」をフィールドで磨いた。',
      en: 'Lesson planning, athlete development, risk management — the job was a constant cycle of judgment calls. I honed the art of designing for people who rely on you.',
    },
  },
  {
    period: { ja: '転換点', en: 'Turning Point' },
    title: { ja: 'テクノロジーが教育を変える瞬間を見た。', en: 'I witnessed technology transform education.' },
    body: {
      ja: '体育の授業にテクノロジーが入り込んできたとき、「これを自分で作れたらもっとくわしくできる」と思った。その感覚は、生徒の希望を図形に落とし込んできた感覚と全く同じだった。',
      en: 'When tech entered PE class, I thought: "If I could build this myself, I could do so much more." That feeling matched exactly what I felt shaping students’ goals.',
    },
  },
  {
    period: { ja: '決断', en: 'The Decision' },
    title: { ja: '深夜に、はじめて HTML を書いた日。', en: 'The night I wrote my first HTML.' },
    body: {
      ja: '授業終了後の深夜、テキストエディタを開いた。エラーだらけでも、生徒を指導していた頃と同じ感覚——「もっとうまくなりたい」があった。',
      en: 'Late at night after class, I opened a text editor. Errors everywhere — yet the same feeling I had coaching students: "I want to get better at this."',
    },
  },
  {
    period: { ja: '学習中', en: 'In Training' },
    title: { ja: 'Spring Boot・React、そして無数のエラーと。', en: 'Spring Boot, React, and countless errors.' },
    body: {
      ja: 'RaiseTech でバックエンドからフロントエンドまで。体育教師時代の PDCA の習慣が、そのままデバッグのメンタルモデルになった。',
      en: 'From backend to frontend at RaiseTech. The PDCA habit from my teaching years became my debugging mental model.',
    },
  },
  {
    period: { ja: '現在', en: 'Now' },
    title: { ja: '教えることと作ることを、コードでつないだ。', en: 'Connected teaching and building through code.' },
    body: {
      ja: '「複雑なことをわかりやすく伝える力」「チームを動かす力」——体育教師として磨いたスキルは、エンジニアとしての武器そのものだった。',
      en: 'The ability to explain complexity clearly, to move a team — skills honed as a PE teacher are weapons as an engineer.',
    },
  },
]

export default function Story() {
  const { t, lang } = useLanguage()
  const sectionRef = useRef<HTMLElement>(null)
  const headRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    const triggers: ReturnType<typeof ScrollTrigger.create>[] = []

    if (headRef.current) {
      headRef.current.classList.add('reveal')
      triggers.push(
        ScrollTrigger.create({
          trigger: headRef.current,
          start: 'top 83%',
          onEnter: () => headRef.current?.classList.add('reveal-in'),
        })
      )
    }

    const items = sectionRef.current.querySelectorAll<HTMLElement>('.tl-item')
    items.forEach((item) => {
      const dot = item.querySelector<HTMLElement>('.tl-dot')
      triggers.push(
        ScrollTrigger.create({
          trigger: item,
          start: 'top 83%',
          onEnter: () => {
            item.classList.add('reveal-in')
            if (dot) {
              dot.style.borderColor = 'var(--color-or)'
              dot.style.backgroundColor = 'var(--color-or)'
              dot.style.boxShadow = '0 0 0 4px #0d0d18, 0 0 18px rgba(249,115,22,.40)'
            }
          },
        })
      )
    })

    return () => triggers.forEach((tr) => tr.kill())
  }, [])

  return (
    <section
      ref={sectionRef}
      id="story"
      style={{
        borderTop: '1px solid rgba(255,255,255,.08)',
        background: '#0d0d18',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '6rem 1.5rem' }}>

        <div ref={headRef} style={{ marginBottom: '3.5rem' }}>
          <p style={{ fontFamily: 'var(--font-en)', fontSize: '0.66rem', fontWeight: 700, color: 'var(--color-or)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Story
          </p>
          <h2
            style={{ fontFamily: 'var(--font-ja)', fontWeight: 700, color: 'var(--color-tx)', marginBottom: '0.75rem', lineHeight: 1.1, letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4.5vw, 2.75rem)' }}
            dangerouslySetInnerHTML={{ __html: t.story_h.replace('\n', '<br/>') }}
          />
          <p style={{ fontFamily: 'var(--font-ja)', color: 'var(--color-sub)', fontSize: '0.88rem', lineHeight: 1.95, maxWidth: '32rem' }}>
            {t.story_desc}
          </p>
        </div>

        <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
          <div style={{
            position: 'absolute', left: 0, top: '0.75rem', bottom: '0.75rem', width: '2px', borderRadius: '999px',
            background: 'linear-gradient(to bottom, var(--color-or), rgba(255,255,255,.08) 70%)',
          }} />

          {TL_ITEMS.map((item, i) => (
            <div
              key={i}
              className="tl-item"
              style={{ position: 'relative', paddingBottom: i < TL_ITEMS.length - 1 ? '2.75rem' : 0, paddingLeft: '2.5rem' }}
            >
              <div
                className="tl-dot"
                style={{
                  position: 'absolute',
                  left: '-8px',
                  top: '5px',
                  width: '1rem',
                  height: '1rem',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,.20)',
                  background: '#0d0d18',
                  transition: 'all 0.5s',
                  boxShadow: '0 0 0 4px #0d0d18',
                }}
              />
              <p style={{ fontFamily: 'var(--font-en)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-or)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                {item.period[lang]}
              </p>
              <h3 style={{ fontFamily: 'var(--font-ja)', fontWeight: 700, color: 'var(--color-tx)', fontSize: '1rem', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                {item.title[lang]}
              </h3>
              <p style={{ fontFamily: 'var(--font-ja)', color: 'var(--color-sub)', fontSize: '0.85rem', lineHeight: 1.95 }}>
                {item.body[lang]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
