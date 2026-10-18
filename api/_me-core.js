// J&C · 개인 흐름표 API. 업무 원본은 노션 Action_DB이고, 화면은 /work/ 와 같은 것을 쓴다(/me/).
// - 노션에 있는 것: 제목(할일 또는 일정), 분야(선택), 태그(선택), 상태(시작 · 보류 · 완료 체크), 날짜 · 데드라인
// - 노션에 칸이 없는 것: 설명 · 메모 · 담당 · 선행 업무 · 순서 · 기록 → Blob(meta)에 업무 id별로 따로 둔다
// 분야 줄은 노션 '분야' 선택지 그대로다(노션에서 이름을 바꾸거나 늘리면 화면에도 그대로 반영).
import { STATUSES, STATUS_NAME, FIELD_NAME, MAX_LOG, text, same, logged } from './_checklist-core.js';
import { loadAreaBoard, areaOp } from './_me-areas.js';

const P = { title: '할일 또는 일정', area: '분야', tag: '태그', doing: '시작', done: '완료', blocked: '보류', skip: '안함', date: '날짜', deadline: '데드라인' };
const NOTION_FIELDS = ['title', 'area', 'tag', 'status', 'start', 'due'];
const NAME = { ...FIELD_NAME, tag: '태그' };
const META_FIELDS = ['detail', 'note', 'owner', 'deps', 'order'];
const DONE_DAYS = 60; // 완료한 업무는 최근 60일 안에 고친 것만 불러온다
const KEEP_VERSIONS = 5;

const ymd = (v) => (v ? String(v).slice(0, 10) : '');
const okDay = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');

function statusOf(props) {
  if (props[P.done]?.checkbox) return 'done';
  if (props[P.blocked]?.checkbox) return 'blocked';
  if (props[P.doing]?.checkbox) return 'doing';
  return 'todo';
}

// 날짜 읽기: 데드라인이 있으면 그것이 마감일. 날짜가 기간이면 시작~끝, 하루면 그날이 마감일.
function datesOf(props) {
  const d = props[P.date]?.date; const dl = props[P.deadline]?.date;
  const due = ymd(dl?.start) || ymd(d?.end) || ymd(d?.start);
  const start = d?.start && (d.end || dl) ? ymd(d.start) : '';
  return { start: start && start !== due ? start : '', due, hasDeadline: Boolean(dl) };
}

export function fromPage(page, meta = {}) {
  const pr = page.properties || {};
  const { start, due, hasDeadline } = datesOf(pr);
  return {
    id: page.id,
    area: pr[P.area]?.select?.id || '',
    status: statusOf(pr),
    title: (pr[P.title]?.title || []).map((t) => t.plain_text).join('').trim() || '(제목 없음)',
    tag: pr[P.tag]?.select?.name || '',
    start, due,
    detail: meta.detail || '', note: meta.note || '', owner: meta.owner || '대표',
    deps: Array.isArray(meta.deps) ? meta.deps : [],
    order: Number.isFinite(meta.order) ? meta.order : Date.parse(page.created_time) / 1e5,
    log: Array.isArray(meta.log) ? meta.log : [],
    url: page.url,
    updatedAt: page.last_edited_time,
    _hasDeadline: hasDeadline,
  };
}

// 노션에 쓸 속성 만들기 (바뀐 칸만)
function toProps(fields, areas, cur) {
  const out = {};
  if ('title' in fields) out[P.title] = { title: [{ text: { content: fields.title } }] };
  if ('area' in fields) { const a = areas.find((x) => x.key === fields.area); out[P.area] = { select: a ? { name: a.name } : null }; }
  if ('tag' in fields) out[P.tag] = { select: fields.tag ? { name: fields.tag } : null };
  if ('status' in fields) {
    out[P.doing] = { checkbox: fields.status === 'doing' };
    out[P.blocked] = { checkbox: fields.status === 'blocked' };
    out[P.done] = { checkbox: fields.status === 'done' };
  }
  if ('start' in fields || 'due' in fields) {
    const start = 'start' in fields ? fields.start : cur?.start || '';
    const due = 'due' in fields ? fields.due : cur?.due || '';
    if (cur?._hasDeadline) {
      // 데드라인을 쓰던 업무는 마감일을 데드라인에, 시작일을 날짜에 둔다
      out[P.deadline] = { date: due ? { start: due } : null };
      out[P.date] = { date: start ? { start } : null };
    } else if (start && due && due > start) out[P.date] = { date: { start, end: due } };
    else if (due || start) out[P.date] = { date: { start: due || start } };
    else out[P.date] = { date: null };
  }
  return out;
}

const clean = (item) => { const { _hasDeadline, ...rest } = item; return rest; };

function whoIs(req, env) {
  const h = req.headers;
  if (same(h['x-checklist-pass'], env.ME_PASSWORD)) {
    let name = '';
    try { name = decodeURIComponent(String(h['x-checklist-user'] || '')); } catch { name = ''; }
    return text(name, 20) || '대표';
  }
  const bearer = String(h.authorization || '').replace(/^Bearer\s+/i, '');
  if (same(h['x-checklist-token'], env.CHECKLIST_AGENT_TOKEN) || same(bearer, env.CHECKLIST_AGENT_TOKEN)) return 'Claude';
  return null;
}

export function createMeHandler({ notion, store, dbId }, env = process.env) {
  // all = true 이면 오래된 완료까지 전부 (?all=1)
  async function loadAll(all) {
    const since = new Date(Date.now() - DONE_DAYS * 864e5).toISOString();
    const recent = { or: [{ property: P.done, checkbox: { equals: false } }, { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } }] };
    const [db, pages, saved] = await Promise.all([
      notion.database(dbId),
      notion.queryAll(dbId, {
        and: [
          { property: P.area, select: { is_not_empty: true } },
          { property: P.skip, checkbox: { equals: false } },
          ...(all ? [] : [recent]),
        ],
      }),
      store.load(),
    ]);
    const areas = (db.properties?.[P.area]?.select?.options || []).map((o) => ({ key: o.id, name: o.name, color: o.color }));
    const tags = (db.properties?.[P.tag]?.select?.options || []).map((o) => ({ name: o.name, color: o.color }));
    const meta = saved.meta || {};
    const items = pages.map((p) => fromPage(p, meta[p.id]));
    const ids = new Set(items.map((i) => i.id));
    items.forEach((i) => { i.deps = i.deps.filter((d) => ids.has(d) && d !== i.id); });
    return { areas, tags, items, meta, versions: saved.versions || [] };
  }

  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    const missing = [];
    if (!env.NOTION_TOKEN) missing.push('notion');
    if (!store.ready()) missing.push('storage');
    if (!env.ME_PASSWORD) missing.push('password');
    if (missing.length) return res.status(503).json({ error: 'not_configured', missing });
    const me = whoIs(req, env);
    if (!me) return res.status(401).json({ error: 'unauthorized' });

    try {
      // 영역 현황판 (/api/me/?scope=areas, 또는 op가 gtd-로 시작)
      const body0 = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})) : {};
      const qs = new URL(req.url || '/', 'http://x').searchParams;
      const q = (k) => String(req.query?.[k] ?? qs.get(k) ?? '');
      const scope = q('scope');
      const boardOpts = { done: q('done') === '1', refs: q('refs') === '1' };
      if ((req.method === 'GET' && scope === 'areas') || String(body0.op || '').startsWith('gtd-')) {
        let board = await loadAreaBoard(notion, dbId, boardOpts);
        if (req.method === 'POST') {
          const err = await areaOp(notion, body0, board);
          if (err) return res.status(400).json({ error: err });
          board = await loadAreaBoard(notion, dbId, boardOpts);
        }
        return res.status(200).json({ ...board, me });
      }
      const { areas, tags, items, meta, versions } = await loadAll(q('all') === '1');
      const tagNames = tags.map((t) => t.name);
      const keys = areas.map((a) => a.key);
      const reply = (list) => res.status(200).json({ items: list.map(clean), areas, tags, me });
      if (req.method === 'GET') return reply(items);
      if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const now = new Date().toISOString();
      const has = (id) => items.some((i) => i.id === id);
      let next = items;
      let metaChanged = false;
      const putMeta = (it) => {
        meta[it.id] = { detail: it.detail, note: it.note, owner: it.owner, deps: it.deps, order: it.order, log: (it.log || []).slice(-MAX_LOG) };
        metaChanged = true;
      };

      switch (body.op) {
        case 'status': {
          const cur = items.find((i) => i.id === body.id);
          if (!STATUSES.includes(body.status) || !cur) return res.status(400).json({ error: 'bad_request' });
          if (cur.status === body.status) return reply(items);
          await notion.update(cur.id, toProps({ status: body.status }, areas, cur));
          const it = logged({ ...cur, status: body.status, updatedAt: now }, me, now, `상태: ${STATUS_NAME[cur.status]} → ${STATUS_NAME[body.status]}`);
          putMeta(it);
          next = items.map((i) => (i.id === it.id ? it : i));
          break;
        }
        case 'add': {
          const raw = body.item || {};
          const title = text(raw.title, 120);
          if (!title) return res.status(400).json({ error: 'title_required' });
          const fields = {
            title, area: keys.includes(raw.area) ? raw.area : keys[0], tag: tagNames.includes(raw.tag) ? raw.tag : '',
            status: STATUSES.includes(raw.status) ? raw.status : 'todo', start: okDay(raw.start), due: okDay(raw.due),
          };
          const page = await notion.create(dbId, toProps(fields, areas, null));
          const order = raw.order === undefined || raw.order === null || raw.order === ''
            ? Math.max(0, ...items.filter((i) => i.area === fields.area).map((i) => i.order || 0)) + 1 : Number(raw.order) || 0;
          const it = logged({
            ...fromPage(page), ...fields,
            detail: text(raw.detail, 1000), note: text(raw.note, 1000), owner: text(raw.owner, 20) || '대표',
            deps: (Array.isArray(raw.deps) ? raw.deps : []).filter(has), order, updatedAt: now,
          }, me, now, '추가');
          putMeta(it);
          next = [...items, it];
          break;
        }
        case 'update': {
          const cur = items.find((i) => i.id === body.id);
          if (!cur || !body.fields || typeof body.fields !== 'object') return res.status(400).json({ error: 'bad_request' });
          const f = body.fields;
          const want = { ...cur };
          if ('title' in f) want.title = text(f.title, 120);
          if (!want.title) return res.status(400).json({ error: 'title_required' });
          if ('area' in f && keys.includes(f.area)) want.area = f.area;
          if ('tag' in f && (f.tag === '' || tagNames.includes(f.tag))) want.tag = f.tag;
          if ('status' in f && STATUSES.includes(f.status)) want.status = f.status;
          if ('start' in f) want.start = okDay(f.start);
          if ('due' in f) want.due = okDay(f.due);
          if ('detail' in f) want.detail = text(f.detail, 1000);
          if ('note' in f) want.note = text(f.note, 1000);
          if ('owner' in f) want.owner = text(f.owner, 20) || '대표';
          if ('deps' in f && Array.isArray(f.deps)) want.deps = [...new Set(f.deps.map((d) => text(d, 40)))].filter((d) => has(d) && d !== cur.id).slice(0, 20);
          if ('order' in f && Number.isFinite(Number(f.order))) want.order = Number(f.order);
          const changed = [...NOTION_FIELDS, ...META_FIELDS].filter((k) => JSON.stringify(want[k]) !== JSON.stringify(cur[k]));
          if (!changed.length) return reply(items);
          const toNotion = Object.fromEntries(changed.filter((k) => NOTION_FIELDS.includes(k)).map((k) => [k, want[k]]));
          if (Object.keys(toNotion).length) await notion.update(cur.id, toProps(toNotion, areas, cur));
          const lines = [];
          if (changed.includes('status')) lines.push(`상태: ${STATUS_NAME[cur.status]} → ${STATUS_NAME[want.status]}`);
          const rest = changed.filter((k) => k !== 'status' && k !== 'order');
          if (rest.length) lines.push(`수정: ${rest.map((k) => NAME[k]).join(', ')}`);
          const it = lines.length ? logged({ ...want, updatedAt: now }, me, now, lines.join(' · ')) : { ...want, updatedAt: now };
          putMeta(it);
          next = items.map((i) => (i.id === it.id ? it : i));
          break;
        }
        case 'delete': {
          if (!has(body.id)) return res.status(404).json({ error: 'not_found' });
          await notion.archive(body.id); // 노션 휴지통으로 간다 (30일 안에 되살릴 수 있음)
          delete meta[body.id]; metaChanged = true;
          next = items.filter((i) => i.id !== body.id).map((i) => {
            if (!i.deps.includes(body.id)) return i;
            const it = { ...i, deps: i.deps.filter((d) => d !== body.id) }; putMeta(it); return it;
          });
          break;
        }
        case 'areas':
        case 'import':
          // 분야는 노션 '분야' 선택지에서, 업무는 노션에서 직접 관리한다
          return res.status(409).json({ error: 'notion_managed' });
        default:
          return res.status(400).json({ error: 'unknown_op' });
      }

      if (metaChanged) {
        // 지금 목록에 없는 업무(완료 후 60일이 지난 것 등)의 메모도 지우지 않고 그대로 둔다
        await store.save({ meta }, versions, KEEP_VERSIONS);
      }
      return reply(next);
    } catch (err) {
      console.error('me api', err);
      // 노션 키가 틀렸거나(401) Action_DB를 통합에 공유하지 않았으면(404) 설정 안내를 띄운다
      if (err.status === 401) return res.status(503).json({ error: 'not_configured', missing: ['notion'] });
      if (err.status === 404) return res.status(503).json({ error: 'not_configured', missing: ['notion_share'] });
      return res.status(err.status ? 502 : 500).json({ error: err.status ? 'notion_error' : 'server_error' });
    }
  };
}

export const _test = { toProps, datesOf };
