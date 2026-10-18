// 빠른 기록: 아이폰 단축어("시리야, 기록")가 부른다. 노션 Action_DB에 제목만 넣어 수집함으로 보낸다.
// 키는 x-capture-key 헤더로 받는다 (CAPTURE_KEY, 없으면 ME_PASSWORD). 이 키로는 기록만 할 수 있다.
import { same, text } from './_checklist-core.js';

export function createCaptureHandler({ notion, dbId, titleProp = '할일 또는 일정' }, env = process.env) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    if (!env.NOTION_TOKEN) return res.status(503).json({ error: 'not_configured' });
    const key = req.headers['x-capture-key'];
    if (!(same(key, env.CAPTURE_KEY) || same(key, env.ME_PASSWORD))) return res.status(401).json({ error: 'unauthorized' });
    let raw = req.body;
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = { text: raw }; } }
    const title = text(raw && (raw.text ?? raw.title), 120);
    if (!title) return res.status(400).json({ error: 'title_required' });
    try {
      await notion.create(dbId, { [titleProp]: { title: [{ text: { content: title } }] } });
      return res.status(200).json({ ok: true, title, message: `수집함에 넣었습니다: ${title}` });
    } catch (err) {
      console.error('capture', err);
      return res.status(502).json({ error: 'notion_error' });
    }
  };
}
