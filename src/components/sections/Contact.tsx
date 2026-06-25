import { useState } from 'react'
import { useLanguage } from '../../hooks/useLanguage'

export default function Contact() {
  const { t } = useLanguage()
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section
      id="contact"
      style={{ pointerEvents: 'auto' }}
      className="py-24 px-6 md:px-16"
    >
      <h2 className="text-3xl md:text-5xl font-en font-extrabold text-[var(--color-tx)] mb-4">
        {t.contact_h}
      </h2>
      <p className="text-[var(--color-sub)] mb-16 max-w-xl">{t.contact_desc}</p>
      {status === 'done' ? (
        <p className="text-[var(--color-or2)] font-semibold">送信しました！ありがとうございます。</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-sub)]">{t.f_name}</label>
            <input
              type="text"
              required
              placeholder={t.f_name_ph}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border border-[var(--color-bd)] rounded-lg px-4 py-3 bg-transparent text-[var(--color-tx)] placeholder:text-[var(--color-bd)] focus:outline-none focus:border-[var(--color-or2)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-sub)]">{t.f_email}</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border border-[var(--color-bd)] rounded-lg px-4 py-3 bg-transparent text-[var(--color-tx)] placeholder:text-[var(--color-bd)] focus:outline-none focus:border-[var(--color-or2)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-sub)]">{t.f_msg}</label>
            <textarea
              required
              rows={5}
              placeholder={t.f_msg_ph}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="border border-[var(--color-bd)] rounded-lg px-4 py-3 bg-transparent text-[var(--color-tx)] placeholder:text-[var(--color-bd)] focus:outline-none focus:border-[var(--color-or2)] resize-none"
            />
          </div>
          {status === 'error' && (
            <p className="text-red-500 text-sm">送信に失敗しました。もう一度お試しください。</p>
          )}
          <button
            type="submit"
            disabled={status === 'sending'}
            className="self-start px-8 py-3 rounded-full bg-[var(--color-or2)] text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {status === 'sending' ? '送信中…' : t.f_submit}
          </button>
        </form>
      )}
    </section>
  )
}
