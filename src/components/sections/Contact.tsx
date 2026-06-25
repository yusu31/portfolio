import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLanguage } from '../../hooks/useLanguage'

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '1px solid var(--color-bd)',
  borderRadius: '0.5rem',
  padding: '0.75rem 1rem',
  color: 'var(--color-tx)',
  fontFamily: 'var(--font-ja)',
  fontSize: '0.87rem',
  outline: 'none',
  transition: 'border-color .2s, box-shadow .2s',
  boxSizing: 'border-box',
}

export default function Contact() {
  const { t } = useLanguage()
  const sectionRef = useRef<HTMLElement>(null)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [validErr, setValidErr] = useState('')
  const successRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    const triggers: ReturnType<typeof ScrollTrigger.create>[] = []

    sectionRef.current.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 83%',
          onEnter: () => el.classList.add('reveal-in'),
        })
      )
    })

    return () => triggers.forEach((tr) => tr.kill())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidErr('')

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setValidErr('すべての項目を入力してください。')
      return
    }

    setStatus('sending')
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('send_failed')
      setStatus('done')
      setForm({ name: '', email: '', message: '' })
      if (successRef.current) {
        gsap.from(successRef.current, { opacity: 0, y: 10, duration: 0.5 })
      }
    } catch {
      setStatus('error')
    }
  }

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-or)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,.08)'
  }
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-bd)'
    e.currentTarget.style.boxShadow = ''
  }

  return (
    <section
      ref={sectionRef}
      id="contact"
      style={{ borderTop: '1px solid var(--color-bd)', background: '#fff', pointerEvents: 'auto' }}
    >
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '6rem 1.5rem' }}>

        <div className="reveal" style={{ marginBottom: '2.5rem' }}>
          <p style={{ fontFamily: 'var(--font-en)', fontSize: '0.66rem', fontWeight: 700, color: 'var(--color-or)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Contact
          </p>
          <h2 style={{ fontFamily: 'var(--font-ja)', fontWeight: 700, color: 'var(--color-tx)', lineHeight: 1.1, letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4.5vw, 2.75rem)', marginBottom: '0.75rem' }}>
            {t.contact_h}
          </h2>
          <p style={{ fontFamily: 'var(--font-ja)', color: 'var(--color-sub)', fontSize: '0.88rem', lineHeight: 1.95, maxWidth: '32rem' }}>
            {t.contact_desc}
          </p>
        </div>

        {status === 'done' ? (
          <div
            ref={successRef}
            className="reveal reveal-in"
            style={{ maxWidth: '490px', padding: '2rem', background: 'var(--color-cream)', border: '1px solid var(--color-bd)', borderRadius: '0.75rem', textAlign: 'center' }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <p style={{ fontFamily: 'var(--font-ja)', fontWeight: 700, color: 'var(--color-tx)', fontSize: '1rem' }}>
              送信しました。近日中にご連絡します！
            </p>
          </div>
        ) : (
          <form
            className="reveal"
            onSubmit={handleSubmit}
            noValidate
            style={{ maxWidth: '490px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontFamily: 'var(--font-ja)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-sub)' }}>{t.f_name}</label>
              <input
                type="text"
                required
                placeholder={t.f_name_ph}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onFocus={focusStyle}
                onBlur={blurStyle}
                style={INPUT_STYLE}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontFamily: 'var(--font-ja)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-sub)' }}>{t.f_email}</label>
              <input
                type="email"
                required
                placeholder="example@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onFocus={focusStyle}
                onBlur={blurStyle}
                style={INPUT_STYLE}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontFamily: 'var(--font-ja)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-sub)' }}>{t.f_msg}</label>
              <textarea
                required
                rows={5}
                placeholder={t.f_msg_ph}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                onFocus={focusStyle as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
                onBlur={blurStyle as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
                style={{ ...INPUT_STYLE, resize: 'none' }}
              />
            </div>

            {validErr && (
              <p style={{ fontFamily: 'var(--font-ja)', fontSize: '0.8rem', color: '#ef4444' }}>{validErr}</p>
            )}
            {status === 'error' && (
              <p style={{ fontFamily: 'var(--font-ja)', fontSize: '0.8rem', color: '#ef4444' }}>
                送信に失敗しました。時間をおいて再度お試しください。
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 2.25rem',
                background: 'var(--color-or)',
                color: '#fff',
                fontFamily: 'var(--font-ja)',
                fontWeight: 700,
                fontSize: '0.87rem',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                marginTop: '0.5rem',
                transition: 'box-shadow .2s, opacity .2s',
                opacity: status === 'sending' ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (status !== 'sending') {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(194,65,12,.35)'
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = ''
              }}
            >
              {status === 'sending' ? '送信中…' : t.f_submit}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
