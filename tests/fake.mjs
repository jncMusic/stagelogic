// 노션 API 흉내: Action_DB 하나
export function fakeNotion() {
  const opts = [['o1', 'J&C · 수업·레슨', 'blue'], ['o2', 'J&C · 수납·급여', 'orange'], ['o5', 'KBA', 'brown'], ['o6', '개인 · 가족', 'pink']].map(([id, name, color]) => ({ id, name, color }));
  const tagOpts = ['높음', '경연대회', '가족'].map((name, i) => ({ id: 't' + i, name, color: 'gray' }));
  const pages = new Map(); let n = 0; const calls = [];
  const mk = (props, extra = {}) => { const id = `pg-${++n}`; const p = { id, url: `https://www.notion.so/${id}`, created_time: new Date(Date.now() + n * 1000).toISOString(), last_edited_time: new Date().toISOString(), archived: false, properties: props, ...extra }; pages.set(id, p); return p; };
  const T = (s) => ({ title: [{ plain_text: s }] }); const sel = (name) => ({ select: name ? opts.find((o) => o.name === name) : null }); const cb = (v) => ({ checkbox: v }); const dt = (start, end) => ({ date: start ? { start, end: end || null } : null });
  const props = (t, area, st = {}, d = [], dl = null) => ({ '할일 또는 일정': T(t), 분야: sel(area), 시작: cb(!!st.doing), 완료: cb(!!st.done), 보류: cb(!!st.blocked), 안함: cb(!!st.skip), 날짜: dt(...d), 데드라인: dl ? dt(dl) : { date: null } });
  mk(props('급여정산', 'J&C · 수납·급여', {}, ['2026-10-24T16:00:00.000+09:00']));
  mk(props('겨울 특강 시간표', 'J&C · 수업·레슨', { doing: 1 }, ['2026-10-18', '2026-10-22']));
  mk(props('대회 결과보고서', 'KBA', {}, ['2026-10-20'], '2026-10-31'));
  mk(props('분야 없는 할 일', null));
  mk(props('안 하기로 한 일', '개인 · 가족', { skip: 1 }));
  mk(props('예전 완료', '개인 · 가족', { done: 1 }), { last_edited_time: '2025-01-01T00:00:00Z' });
  const match = (p, f) => {
    if (f.and) return f.and.every((x) => match(p, x)); if (f.or) return f.or.some((x) => match(p, x));
    if (f.timestamp === 'created_time') return p.created_time >= f.created_time.on_or_after;
    if (f.timestamp) return p.last_edited_time >= f.last_edited_time.on_or_after;
    const v = p.properties[f.property];
    if (f.select) return f.select.is_not_empty ? Boolean(v && v.select) : f.select.is_empty ? !(v && v.select) : true;
    if (f.checkbox) return v.checkbox === f.checkbox.equals;
    return true;
  };
  const apply = (p, pr) => { for (const [k, v] of Object.entries(pr)) { if (k === '할일 또는 일정') p.properties[k] = T(v.title[0].text.content); else if (k === '분야') p.properties[k] = sel(v.select && v.select.name); else if (k === '태그') p.properties[k] = { select: v.select ? tagOpts.find((o) => o.name === v.select.name) : null }; else p.properties[k] = v; } p.last_edited_time = new Date().toISOString(); };
  return {
    pages, calls,
    database: async () => { calls.push('db'); return { properties: { 분야: { select: { options: opts } }, 태그: { select: { options: tagOpts } } } }; },
    queryAll: async (id, f) => { calls.push('query'); return [...pages.values()].filter((p) => !p.archived && (!f || match(p, f))); },
    create: async (db, pr) => { calls.push(['create', pr]); const p = mk(props('', null)); apply(p, pr); return p; },
    update: async (id, pr) => { calls.push(['update', id, pr]); const p = pages.get(id); if (!p) { const e = new Error('nf'); e.status = 404; throw e; } apply(p, pr); return p; },
    archive: async (id) => { calls.push(['archive', id]); pages.get(id).archived = true; },
  };
}
export function memStore() { let data = { meta: undefined }, versions = []; return { ready: () => true, async load() { return { ...JSON.parse(JSON.stringify(data)), versions }; }, async save(d, v) { data = JSON.parse(JSON.stringify(d)); versions = ['v' + (versions.length + 1), ...versions]; }, peek: () => data }; }
