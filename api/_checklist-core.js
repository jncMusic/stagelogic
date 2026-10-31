// 업무 흐름(사업 점검표) API의 본체. 저장소(store)를 바깥에서 받아 테스트할 수 있게 둔다.
// 저장 형태: { items: [업무…], areas: [{ key, name }…] }
import { randomUUID, timingSafeEqual } from 'node:crypto';

export const DEFAULT_AREAS = [
  { key: 'base', name: '사업 기반' },
  { key: 'portfolio', name: '포트폴리오' },
  { key: 'stage', name: '공연기획' },
  { key: 'web', name: '홈페이지 제작' },
  { key: 'academy', name: '학원 솔루션 · 키트' },
  { key: 'sales', name: '판매 · 마케팅' },
];
export const STATUSES = ['todo', 'doing', 'blocked', 'done'];
export const STATUS_NAME = { todo: '할 일', doing: '진행 중', blocked: '막힘', done: '완료' };
const KEEP_VERSIONS = 5; // 저장할 때마다 새 파일을 만들고, 최근 5개만 남긴다
const MAX_AREAS = 8; // 분야마다 구별되는 색을 하나씩 주기 위해 8개까지
export const MAX_LOG = 30;
export const NOTE_MAX = 5000; // 메모 · 진행 상황은 길게 쓸 수 있게
export const EDITABLE = ['title', 'detail', 'note', 'owner', 'area', 'status', 'start', 'due', 'deps', 'order'];
export const FIELD_NAME = { title: '제목', detail: '설명', note: '메모', owner: '담당', area: '분야', start: '시작일', due: '마감일', deps: '선행 업무', order: '순서' };

const NOTION_ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/;

export const text = (v, max) => String(v ?? '').trim().slice(0, max);
export const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');

function cleanAreas(raw) {
  const seen = new Set();
  const out = [];
  for (const a of Array.isArray(raw) ? raw : []) {
    const name = text(a && a.name, 30);
    let key = text(a && a.key, 24).replace(/[^\w-]/g, '');
    if (!name) continue;
    if (!key || seen.has(key)) key = `a${randomUUID().slice(0, 6)}`;
    seen.add(key);
    out.push({ key, name });
    if (out.length >= MAX_AREAS) break;
  }
  return out.length ? out : DEFAULT_AREAS.map((a) => ({ ...a }));
}

export function cleanItem(raw, areaKeys) {
  const id = text(raw.id, 40) || randomUUID().slice(0, 8);
  const deps = Array.isArray(raw.deps) ? [...new Set(raw.deps.map((d) => text(d, 40)).filter(Boolean))].slice(0, 20) : [];
  const log = Array.isArray(raw.log)
    ? raw.log.filter((l) => l && l.at && l.text).slice(-MAX_LOG).map((l) => ({ at: String(l.at), by: text(l.by, 20), text: text(l.text, 200) }))
    : [];
  return {
    id,
    area: areaKeys.includes(raw.area) ? raw.area : areaKeys[0],
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : 0,
    owner: text(raw.owner, 20) || '대표',
    status: STATUSES.includes(raw.status) ? raw.status : 'todo',
    title: text(raw.title, 120),
    detail: text(raw.detail, 1000),
    note: text(raw.note, NOTE_MAX),
    start: day(raw.start),
    due: day(raw.due),
    deps: deps.filter((d) => d !== id),
    log,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    // 노션 Action_DB 페이지와 이어 둔 업무 (_checklist-notion.js)
    ...(raw.notion && NOTION_ID.test(String(raw.notion.id || ''))
      ? { notion: { id: String(raw.notion.id), seen: text(raw.notion.seen, 40), dl: Boolean(raw.notion.dl), dirty: Boolean(raw.notion.dirty) } } : {}),
  };
}

export function same(given, secret) {
  if (!secret) return false;
  const got = Buffer.from(String(given || ''));
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

// 사람은 비밀번호(x-checklist-pass)로, Claude는 따로 발급한 토큰으로 연다.
// 토큰은 x-checklist-token 헤더나 Authorization: Bearer 로 받는다 (클라우드 환경의 네트워크 시크릿이 붙여 줄 수 있게).
// 돌려주는 값은 기록에 남길 이름이다. 사람은 x-checklist-user 로 이름을 보낼 수 있다.
function whoIs(req, env) {
  const h = req.headers;
  if (same(h['x-checklist-pass'], env.CHECKLIST_PASSWORD)) {
    let name = '';
    try { name = decodeURIComponent(String(h['x-checklist-user'] || '')); } catch { name = ''; }
    return text(name, 20) || '대표';
  }
  const bearer = String(h.authorization || '').replace(/^Bearer\s+/i, '');
  if (same(h['x-checklist-token'], env.CHECKLIST_AGENT_TOKEN) || same(bearer, env.CHECKLIST_AGENT_TOKEN)) return 'Claude';
  return null;
}

// 같은 사람이 같은 칸을 30분 안에 다시 고치면(글을 쓰는 동안 자동 저장) 기록을 한 줄로 합친다
const MERGE_MS = 30 * 60e3;
export const logged = (item, by, at, line) => {
  const log = [...(item.log || [])], last = log.at(-1);
  if (last && last.by === by && last.text === line && Date.parse(at) - Date.parse(last.at) < MERGE_MS) log[log.length - 1] = { at, by, text: line };
  else log.push({ at, by, text: line });
  return { ...item, log: log.slice(-MAX_LOG) };
};

export function createHandler(store, env = process.env, sync = null) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    // 무엇이 빠졌는지 이름만 알려 준다 (값은 내보내지 않는다)
    const missing = [];
    if (!store.ready()) missing.push('storage');
    if (!env.CHECKLIST_PASSWORD) missing.push('password');
    if (missing.length) return res.status(503).json({ error: 'not_configured', missing });
    const me = whoIs(req, env);
    if (!me) return res.status(401).json({ error: 'unauthorized' });

    try {
      const loaded = await store.load();
      const areas = cleanAreas(loaded.areas);
      const keys = areas.map((a) => a.key);
      let items = (loaded.items || []).map((i) => cleanItem(i, keys));
      const reply = (data) => res.status(200).json({ ...data, me });
      if (req.method === 'GET') {
        const pulled = sync && await sync.reconcile(items, areas, new Date().toISOString());
        if (pulled) { items = pulled; await store.save({ items, areas }, loaded.versions || [], KEEP_VERSIONS); }
        return reply({ items, areas });
      }
      if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const now = new Date().toISOString();
      const has = (id) => items.some((i) => i.id === id);
      let next = items;
      let nextAreas = areas;

      switch (body.op) {
        case 'status': {
          if (!STATUSES.includes(body.status) || !has(body.id)) return res.status(400).json({ error: 'bad_request' });
          next = items.map((i) => (i.id === body.id && i.status !== body.status
            ? logged({ ...i, status: body.status, updatedAt: now }, me, now, `상태: ${STATUS_NAME[i.status]} → ${STATUS_NAME[body.status]}`)
            : i));
          break;
        }
        case 'add': {
          const raw = body.item || {};
          const item = cleanItem({ ...raw, id: '', log: [], updatedAt: now }, keys);
          if (!item.title) return res.status(400).json({ error: 'title_required' });
          item.deps = item.deps.filter(has);
          if (raw.order === undefined || raw.order === null || raw.order === '') {
            item.order = Math.max(0, ...items.filter((i) => i.area === item.area).map((i) => i.order || 0)) + 1;
          }
          next = [...items, logged(item, me, now, '추가')];
          break;
        }
        case 'update': {
          // 제목 · 설명 · 메모 · 담당 · 분야 · 상태 · 날짜 · 선행 업무 · 순서를 고친다. 빠진 칸은 그대로 둔다.
          const cur = items.find((i) => i.id === body.id);
          if (!cur || !body.fields || typeof body.fields !== 'object') return res.status(400).json({ error: 'bad_request' });
          const patch = Object.fromEntries(EDITABLE.filter((k) => k in body.fields).map((k) => [k, body.fields[k]]));
          const item = cleanItem({ ...cur, ...patch, id: cur.id, updatedAt: now }, keys);
          if (!item.title) return res.status(400).json({ error: 'title_required' });
          item.deps = item.deps.filter((d) => has(d) && d !== item.id);
          const changed = EDITABLE.filter((k) => JSON.stringify(item[k]) !== JSON.stringify(cur[k]));
          if (!changed.length) return reply({ items, areas });
          const lines = [];
          if (changed.includes('status')) lines.push(`상태: ${STATUS_NAME[cur.status]} → ${STATUS_NAME[item.status]}`);
          const rest = changed.filter((k) => k !== 'status' && k !== 'order');
          if (rest.length) lines.push(`수정: ${rest.map((k) => FIELD_NAME[k]).join(', ')}`);
          const out = lines.length ? logged(item, me, now, lines.join(' · ')) : item;
          next = items.map((i) => (i.id === body.id ? out : i));
          break;
        }
        case 'delete': {
          if (!has(body.id)) return res.status(404).json({ error: 'not_found' });
          const gone = items.find((i) => i.id === body.id);
          if (sync && gone.notion) {
            try { await sync.remove(gone.notion.id); } catch (err) { console.error('checklist notion remove', err); return res.status(502).json({ error: 'notion_error' }); }
          }
          next = items.filter((i) => i.id !== body.id)
            .map((i) => (i.deps.includes(body.id) ? { ...i, deps: i.deps.filter((d) => d !== body.id) } : i));
          break;
        }
        case 'areas': {
          // 분야 목록을 통째로 바꾼다 (이름 바꾸기 · 추가 · 순서). 업무가 남은 분야는 지울 수 없다.
          if (!Array.isArray(body.areas) || !body.areas.length) return res.status(400).json({ error: 'bad_request' });
          nextAreas = cleanAreas(body.areas);
          const kept = new Set(nextAreas.map((a) => a.key));
          if (items.some((i) => !kept.has(i.area))) return res.status(409).json({ error: 'area_in_use' });
          break;
        }
        case 'import': {
          if (items.length) return res.status(409).json({ error: 'not_empty' });
          if (!Array.isArray(body.items) || body.items.length > 500) return res.status(400).json({ error: 'bad_request' });
          if (Array.isArray(body.areas) && body.areas.length) nextAreas = cleanAreas(body.areas);
          const k = nextAreas.map((a) => a.key);
          next = body.items.map((i) => cleanItem(i, k)).filter((i) => i.title);
          break;
        }
        case 'link': {
          // 노션 페이지와 잇기: { links: { 업무 id: 노션 페이지 id 또는 '' (끊기) } }
          if (!body.links || typeof body.links !== 'object') return res.status(400).json({ error: 'bad_request' });
          const links = body.links;
          if (Object.entries(links).some(([id, pg]) => !has(id) || (pg !== '' && !NOTION_ID.test(String(pg))))) return res.status(400).json({ error: 'bad_request' });
          next = items.map((i) => {
            if (!(i.id in links)) return i;
            const { notion: _old, ...rest } = i;
            return links[i.id] ? { ...rest, notion: { id: String(links[i.id]), seen: '', dl: false, dirty: false } } : rest;
          });
          break;
        }
        default:
          return res.status(400).json({ error: 'unknown_op' });
      }

      if (sync && body.op !== 'link') next = await sync.afterWrite(items, next, areas, nextAreas, body.op);
      await store.save({ items: next, areas: nextAreas }, loaded.versions || [], KEEP_VERSIONS);
      return reply({ items: next, areas: nextAreas });
    } catch (err) {
      console.error('checklist api', err);
      return res.status(500).json({ error: 'server_error' });
    }
  };
}
