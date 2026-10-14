// 메일 보내기 (Resend). 필요한 환경 변수:
//   RESEND_API_KEY  — Resend 에서 발급한 키
//   MAIL_FROM       — 보내는 주소. 도메인 인증 전에는 'onboarding@resend.dev' (Resend 가입 메일로만 감)
//                     인증 후 예: '스테이지로직 <hello@stagelogic.kr>'
//   MAIL_TO         — 받는 주소 (기본 stagelogic@naver.com)
export const mailReady = (env = process.env) => Boolean(env.RESEND_API_KEY);
export const mailTo = (env = process.env) => env.MAIL_TO || 'stagelogic@naver.com';

export async function sendMail({ to, subject, html, text, replyTo }, env = process.env, fetchImpl = fetch) {
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || '스테이지로직 <onboarding@resend.dev>',
      to: [to || mailTo(env)],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`mail_failed ${res.status} ${await res.text().catch(() => '')}`.slice(0, 300));
  return res.json().catch(() => ({}));
}

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
