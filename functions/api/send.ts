import { Resend } from 'resend';

interface Env {
  RESEND_API_KEY: string;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const json = () => (headers: Record<string, string>, body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
  const res = json();

  try {
    const { name, email, message } = await request.json() as Record<string, string>;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res({}, { error: 'required' }, 400);
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>',
      to: ['3.fortschritt@gmail.com'],
      subject: `【ポートフォリオ】${esc(name)} 様からのお問い合わせ`,
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
        <p><strong>お名前:</strong> ${esc(name)}</p>
        <p><strong>メールアドレス:</strong> ${esc(email)}</p>
        <p><strong>メッセージ:</strong></p>
        <p style="white-space:pre-wrap">${esc(message)}</p>
        </body></html>`,
    });

    if (error) return res({}, { error: error.message }, 500);
    return res({}, { ok: true }, 200);
  } catch {
    return res({}, { error: 'server_error' }, 500);
  }
};
