// 빠른 기록: 아이폰 단축어("시리야, 기록")가 부른다. 노션 Action_DB에 제목만 넣어 수집함으로 보낸다.
// 키는 CAPTURE_KEY (없으면 ME_PASSWORD). 이 키로는 기록만 할 수 있다.
// 두 가지 방식을 받는다:
//  - 간단: GET /api/capture/?k=키&t=내용   ← 단축어에서 주소 한 줄만 넣으면 됨
//  - 기본: POST {text} + 헤더 x-capture-key
import { same, text } from './_checklist-core.js';

export function createCaptureHandler({ notion, dbId, titleProp = '할일 또는 일정' }, env = process.env) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
    const qs = new URL(req.url || '/', 'http://x').searchParams;
    const q = (k) => String(req.query?.[k] ?? qs.get(k) ?? '');
    const plain = req.method === 'GET'; // 단축어 '결과 보기'나 시리가 그대로 읽을 수 있게 글로 답한다
    const reply = (code, msg, extra = {}) => (plain ? (res.setHeader('Content-Type', 'text/plain; charset=utf-8'), res.status(code).send(msg)) : res.status(code).json({ ...extra, message: msg }));
    if (!env.NOTION_TOKEN) return reply(503, '기록 설정이 아직입니다.', { error: 'not_configured' });
    const key = req.headers['x-capture-key'] || q('k');
    if (!(same(key, env.CAPTURE_KEY) || same(key, env.ME_PASSWORD))) return reply(401, '키가 맞지 않습니다. 단축어의 주소를 확인해 주세요.', { error: 'unauthorized' });
    let raw = req.body;
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = { text: raw }; } }
    const title = text(String((raw && (raw.text ?? raw.title)) || q('t')).replace(/\s+/g, ' '), 120);
    if (!title) return reply(400, '기록할 내용이 없습니다.', { error: 'title_required' });
    try {
      await notion.create(dbId, { [titleProp]: { title: [{ text: { content: title } }] } });
      return reply(200, `기록했습니다: ${title}`, { ok: true, title });
    } catch (err) {
      console.error('capture', err);
      return reply(502, '노션에 넣지 못했습니다. 잠시 후 다시 해 주세요.', { error: 'notion_error' });
    }
  };
}
