// 홈페이지 문의 양식 → 대표 메일. 보낸 사람의 이메일이 있으면 '답장'이 그 주소로 간다.
import { escapeHtml as e } from './_mail.js';

const TYPES = { stage: '공연기획', web: '홈페이지 제작', classlogic: '클래스로직 출시 알림', etc: '기타' };
const t = (v, max) => String(v ?? '').trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    if (!f.name || !f.phone || !f.message) return res.status(400).json({ error: 'required' });
    if (f.email && !EMAIL.test(f.email)) return res.status(400).json({ error: 'email' });
    const rows = [['문의 분야', TYPES[f.type]], ['성함', f.name], ['소속', f.org || '-'], ['연락처', f.phone], ['이메일', f.email || '-']];
    const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111">
      <h2 style="margin:0 0 12px;font-size:18px">홈페이지 문의 · ${e(TYPES[f.type])}</h2>
      <table style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><th style="text-align:left;padding:4px 12px 4px 0;color:#666;font-weight:600">${k}</th><td style="padding:4px 0">${e(v)}</td></tr>`).join('')}</table>
      <div style="margin-top:16px;padding:12px 14px;background:#f4f3ef;border-radius:8px;white-space:pre-wrap">${e(f.message)}</div>
      <p style="color:#888;font-size:12px;margin-top:16px">www.stagelogic.kr 문의 양식에서 보냈습니다.${f.email ? ' 답장하면 문의하신 분께 바로 갑니다.' : ''}</p></div>`;
    const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${f.message}`;
    try {
      await send({ to: to(), subject: `[홈페이지 문의] ${TYPES[f.type]} - ${f.name}${f.org ? ` (${f.org})` : ''}`, html, text, replyTo: f.email || undefined });
    } catch (err) {
      console.error('contact mail', err);
      return res.status(502).json({ error: 'mail_failed' });
    }
    return res.status(200).json({ ok: true });
  };
}
