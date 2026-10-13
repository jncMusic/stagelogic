// 사업 점검표 API의 본체. 저장소(store)를 바깥에서 받아 테스트할 수 있게 둔다.
import { randomUUID, timingSafeEqual } from 'node:crypto';

const AREAS = new Set(['base', 'portfolio', 'stage', 'web', 'academy', 'sales']);
const STATUSES = new Set(['todo', 'doing', 'done', 'blocked']);
const OWNERS = new Set(['대표', 'Claude', '함께']);
const KEEP_VERSIONS = 5; // 저장할 때마다 새 파일을 만들고, 최근 5개만 남긴다

const text = (v, max) => String(v ?? '').trim().slice(0, max);

function clean(raw) {
  const area = AREAS.has(raw.area) ? raw.area : 'base';
  return {
    id: text(raw.id, 40) || randomUUID().slice(0, 8),
    area,
    order: Number.isFinite(raw.order) ? raw.order : 0,
    owner: OWNERS.has(raw.owner) ? raw.owner : '대표',
    status: STATUSES.has(raw.status) ? raw.status : 'todo',
    title: text(raw.title, 120),
    detail: text(raw.detail, 500),
    note: text(raw.note, 500),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

function authorized(req, password) {
  if (!password) return false;
  const got = Buffer.from(String(req.headers['x-checklist-pass'] || ''));
  const want = Buffer.from(password);
  return got.length === want.length && timingSafeEqual(got, want);
}

export function createHandler(store, env = process.env) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (!store.ready() || !env.CHECKLIST_PASSWORD) return res.status(503).json({ error: 'not_configured' });
    if (!authorized(req, env.CHECKLIST_PASSWORD)) return res.status(401).json({ error: 'unauthorized' });

    try {
      const { items, versions } = await store.load();
      if (req.method === 'GET') return res.status(200).json({ items });
      if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const now = new Date().toISOString();
      let next;

      switch (body.op) {
        case 'status': {
          if (!STATUSES.has(body.status) || !items.some((i) => i.id === body.id)) return res.status(400).json({ error: 'bad_request' });
          next = items.map((i) => (i.id === body.id ? { ...i, status: body.status, updatedAt: now } : i));
          break;
        }
        case 'add': {
          const item = clean({ ...body.item, id: '', status: 'todo', updatedAt: now });
          if (!item.title) return res.status(400).json({ error: 'title_required' });
          item.order = Math.max(0, ...items.filter((i) => i.area === item.area).map((i) => i.order || 0)) + 1;
          next = [...items, item];
          break;
        }
        case 'delete': {
          if (!items.some((i) => i.id === body.id)) return res.status(404).json({ error: 'not_found' });
          next = items.filter((i) => i.id !== body.id);
          break;
        }
        case 'import': {
          if (items.length) return res.status(409).json({ error: 'not_empty' });
          if (!Array.isArray(body.items) || body.items.length > 500) return res.status(400).json({ error: 'bad_request' });
          next = body.items.map(clean).filter((i) => i.title);
          break;
        }
        default:
          return res.status(400).json({ error: 'unknown_op' });
      }

      await store.save(next, versions, KEEP_VERSIONS);
      return res.status(200).json({ items: next });
    } catch (err) {
      console.error('checklist api', err);
      return res.status(500).json({ error: 'server_error' });
    }
  };
}
