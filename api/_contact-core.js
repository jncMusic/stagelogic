// 홈페이지 문의 양식 → 대표 메일. 보낸 사람의 이메일이 있으면 '답장'이 그 주소로 간다.
import { escapeHtml as e } from './_mail.js';

const TYPES = { stage: '음악회 · 행사', contest: '대회 · 콩쿠르', web: '홈페이지', classlogic: '클래스로직', etc: '기타' };
const MAX_ANSWERS = 30;
const t = (v, max) => String(v ?? '').trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const table = (pairs) => `<table style="border-collapse:collapse">${pairs.map(([k, v]) => `<tr><th style="text-align:left;vertical-align:top;padding:4px 12px 4px 0;color:#666;font-weight:600;white-space:nowrap">${e(k)}</th><td style="padding:4px 0">${e(v)}</td></tr>`).join('')}</table>`;

export function createContactHandler({ ready, send, to }) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    if (!ready()) return res.status(503).json({ error: 'not_configured' });
    let b;
    try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch { return res.status(400).json({ error: 'bad_request' }); }
    // 자동 입력 봇 거르기: 숨은 칸(website)이 채워졌거나, 화면을 연 지 3초도 안 돼 보낸 경우
    if (t(b.website, 200) || (Number(b.elapsed) > 0 && Number(b.elapsed) < 3000)) return res.status(200).json({ ok: true });
    const f = {
      type: TYPES[b.type] ? b.type : 'etc', name: t(b.name, 40), org: t(b.org, 80),
      phone: t(b.phone, 40), email: t(b.email, 120), message: t(b.message, 5000),
    };
    // 문의 화면에서 고른 답: [{ q: 질문, a: 답 }…]
    const answers = (Array.isArray(b.answers) ? b.answers : []).slice(0, MAX_ANSWERS)
      .map((x) => [t(x && x.q, 80), t(x && x.a, 300)]).filter(([q, a]) => q && a);
    if (!f.name || !f.phone || (!f.message && !answers.length)) return res.status(400).json({ error: 'required' });
    if (f.email && !EMAIL.test(f.email)) return res.status(400).json({ error: 'email' });
    const rows = [['문의 분야', TYPES[f.type]], ['성함', f.name], ['소속', f.org || '-'], ['연락처', f.phone], ['이메일', f.email || '-']];
    const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111">
      <h2 style="margin:0 0 12px;font-size:18px">홈페이지 문의 · ${e(TYPES[f.type])}</h2>
      ${answers.length ? `<h3 style="margin:0 0 6px;font-size:14px;color:#8a6d1f">고른 내용</h3>${table(answers)}` : ''}
      <h3 style="margin:16px 0 6px;font-size:14px;color:#8a6d1f">연락처</h3>${table(rows.slice(1))}
      ${f.message ? `<div style="margin-top:16px;padding:12px 14px;background:#f4f3ef;border-radius:8px;white-space:pre-wrap">${e(f.message)}</div>` : ''}
      <p style="color:#888;font-size:12px;margin-top:16px">www.stagelogic.kr 문의 양식에서 보냈습니다.${f.email ? ' 답장하면 문의하신 분께 바로 갑니다.' : ''}</p></div>`;
    const text = [...answers, ...rows].map(([k, v]) => `${k}: ${v}`).join('\n') + (f.message ? `\n\n${f.message}` : '');
    try {
      await send({ to: to(), subject: `[홈페이지 문의] ${TYPES[f.type]} - ${f.name}${f.org ? ` (${f.org})` : ''}`, html, text, replyTo: f.email || undefined });
    } catch (err) {
      console.error('contact mail', err);
      return res.status(502).json({ error: 'mail_failed' });
    }
    return res.status(200).json({ ok: true });
  };
}
