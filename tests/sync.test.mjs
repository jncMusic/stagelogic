import assert from 'node:assert/strict';
import { createHandler } from '../api/_checklist-core.js';
import { workSync } from '../api/_checklist-notion.js';

let clock = 0; const t = () => `2026-10-20T01:${String(++clock).padStart(2, '0')}:00.000Z`;
let seq = 0; const nid = () => `3ff46c00-a29b-8000-8000-${String(++seq).padStart(12, '0')}`;
const pages = {}; const trash = {};
const mk = (title, extra = {}) => { const id = nid(); pages[id] = { id, url: 'u', created_time: t(), last_edited_time: t(), archived: false, properties: {
  '할일 또는 일정': { title: [{ plain_text: title }] }, 분야: { select: { id: 'sl', name: 'Stagelogic' } }, 태그: { select: null },
  완료: { checkbox: false }, 시작: { checkbox: false }, 보류: { checkbox: false }, 안함: { checkbox: false }, 날짜: { date: null }, 데드라인: { date: null }, ...extra } }; return id; };
const apply = (pg, props) => { for (const [k, v] of Object.entries(props)) {
  if (v.title) pg.properties[k] = { title: v.title.map((x) => ({ plain_text: x.text.content })) };
  else if ('select' in v) pg.properties[k] = { select: v.select ? { id: v.select.name, name: v.select.name } : null };
  else pg.properties[k] = v; } pg.last_edited_time = t(); };
let fail = false, pulls = 0;
const notion = {
  async queryAll(db, filter) { pulls += 1; if (fail === 'pull') throw new Error('down'); return Object.values(pages).filter((p) => p.properties.분야.select?.name === filter.select.equals); },
  async page(id) { const p = pages[id] || trash[id]; if (!p) throw Object.assign(new Error('nf'), { status: 404 }); return p; },
  async update(id, props) { if (fail === 'write') throw new Error('x'); apply(pages[id], props); return pages[id]; },
  async create(db, props) { const id = mk(''); apply(pages[id], props); return pages[id]; },
  async archive(id) { trash[id] = { ...pages[id], archived: true }; delete pages[id]; return trash[id]; },
};
const A = mk('기존 A'), B = mk('기존 B', { 시작: { checkbox: true } }), C = mk('노션에서만');
let st = { items: [{ id: 'a', title: '기존 A', status: 'todo', area: 'base' }, { id: 'b', title: '기존 B', status: 'todo', area: 'stage', deps: ['a'] }], areas: [{ key: 'base', name: '사업 기반' }, { key: 'stage', name: '공연기획' }] };
let saves = 0;
const store = { ready: () => true, async load() { return { ...JSON.parse(JSON.stringify(st)), versions: [] }; }, async save(d) { saves += 1; st = JSON.parse(JSON.stringify(d)); } };
const h = createHandler(store, { CHECKLIST_PASSWORD: 'pw' }, workSync({ notion }));
const call = async (method, body) => { let code, out; const res = { setHeader() {}, status(c) { code = c; return res; }, json(j) { out = j; return res; } }; await h({ method, headers: { 'x-checklist-pass': 'pw' }, body }, res); return { code, out }; };
const get = (r, id) => r.out.items.find((i) => i.id === id);
const byTitle = (r, title) => r.out.items.find((i) => i.title === title);

// 잇기 전: 노션을 안 읽고, 아무것도 들여오지 않음
let r = await call('GET'); assert.equal(pulls, 0); assert.equal(r.out.items.length, 2);
// /work/ 에서 새로 만들어도 잇기 전이면 노션은? → add 는 만든다 (연결 대상 분야)
assert.equal((await call('POST', { op: 'link', links: { a: 'nope' } })).code, 400);
r = await call('POST', { op: 'link', links: { a: A, b: B } }); assert.equal(get(r, 'a').notion.id, A);
// 첫 GET: B 단계 가져옴 + 노션에서만 있던 C 들여옴
r = await call('GET');
assert.equal(get(r, 'b').status, 'doing'); assert.equal(get(r, 'b').log.at(-1).by, '노션');
const c = byTitle(r, '노션에서만'); assert.ok(c && c.notion.id === C && c.area === 'base'); assert.equal(c.log.at(-1).text, '노션에서 추가');
const s1 = saves; await call('GET'); assert.equal(saves, s1, 'stable');
// /work/ → 노션: 제목 · 단계 · 날짜 · 분야
r = await call('POST', { op: 'update', id: 'a', fields: { title: '기존 A2', status: 'done', start: '2026-10-21', due: '2026-10-25', area: 'stage', note: 'n' } });
const pa = pages[A].properties;
assert.equal(pa['할일 또는 일정'].title[0].plain_text, '기존 A2'); assert.equal(pa.완료.checkbox, true);
assert.deepEqual(pa.날짜.date, { start: '2026-10-21', end: '2026-10-25' }); assert.equal(pa.태그.select.name, '공연기획');
r = await call('GET'); assert.equal(get(r, 'a').title, '기존 A2', 'no bounce'); assert.equal(get(r, 'a').status, 'done');
// 메모만 바꾸면 노션에 안 씀
let e = pages[A].last_edited_time; await call('POST', { op: 'update', id: 'a', fields: { note: 'zz' } }); assert.equal(pages[A].last_edited_time, e);
// 노션 → /work/: 제목 · 단계 · 마감 · 태그
apply(pages[B], { '할일 또는 일정': { title: [{ text: { content: 'B 노션에서 고침' } }] }, 완료: { checkbox: true }, 데드라인: { date: { start: '2026-11-01' } }, 태그: { select: { name: '사업 기반' } } });
r = await call('GET'); const b = get(r, 'b');
assert.equal(b.title, 'B 노션에서 고침'); assert.equal(b.status, 'done'); assert.equal(b.due, '2026-11-01'); assert.equal(b.area, 'base'); assert.equal(b.notion.dl, true);
assert.match(b.log.at(-1).text, /진행 중 → 완료/);
// 데드라인을 쓰는 업무는 마감을 데드라인에 씀
await call('POST', { op: 'update', id: 'b', fields: { due: '2026-11-05' } }); assert.equal(pages[B].properties.데드라인.date.start, '2026-11-05');
// /work/ 에서 새 업무 → 노션 페이지 (분야 Stagelogic, 태그 = 분야 이름)
r = await call('POST', { op: 'add', item: { title: '새 업무', area: 'stage', due: '2026-12-01' } });
const n = byTitle(r, '새 업무'); assert.ok(n.notion); const np = pages[n.notion.id];
assert.equal(np.properties.분야.select.name, 'Stagelogic'); assert.equal(np.properties.태그.select.name, '공연기획');
r = await call('GET'); assert.equal(r.out.items.filter((i) => i.title === '새 업무').length, 1, 'no duplicate');
// 노션에서 새로 만든 것 (태그 있음)
const D = mk('노션 새 일', { 태그: { select: { id: 'x', name: '공연기획' } } });
r = await call('GET'); assert.equal(byTitle(r, '노션 새 일').area, 'stage');
// 노션 쓰기 실패 → /work/ 는 저장, 다음 GET 에 다시 씀
fail = 'write'; r = await call('POST', { op: 'status', id: 'b', status: 'todo' }); assert.equal(r.code, 200); assert.equal(get(r, 'b').notion.dirty, true);
fail = false; r = await call('GET'); assert.equal(pages[B].properties.완료.checkbox, false); assert.equal(get(r, 'b').status, 'todo'); assert.equal(get(r, 'b').notion.dirty, false);
// 노션 읽기 실패 → 그대로 보여 줌
fail = 'pull'; assert.equal((await call('GET')).code, 200); fail = false;
// 분야 이름 바꾸기 → 그 분야 업무 태그도
r = await call('POST', { op: 'areas', areas: [{ key: 'base', name: '사업 기반' }, { key: 'stage', name: '공연 기획' }] });
assert.equal(pages[A].properties.태그.select.name, '공연 기획');
// 노션에서 '안함' → /work/ 에서 빠짐, 선행도 정리
apply(pages[A], { 안함: { checkbox: true } });
r = await call('GET'); assert.ok(!get(r, 'a')); assert.deepEqual(get(r, 'b').deps, []);
// 노션에서 지움(휴지통) → 빠짐
await notion.archive(D); r = await call('GET'); assert.ok(!byTitle(r, '노션 새 일'));
// 노션에서 다른 분야로 옮김 → 잇기만 끊고 남김
apply(pages[C], { 분야: { select: { name: 'J&C' } } });
r = await call('GET'); const cc = byTitle(r, '노션에서만'); assert.ok(cc && !cc.notion);
// /work/ 에서 지움 → 노션 휴지통
r = await call('POST', { op: 'delete', id: 'b' }); assert.equal(r.code, 200); assert.ok(!pages[B] && trash[B]);
r = await call('GET'); assert.ok(!r.out.items.some((i) => i.title === 'B 노션에서 고침'), 'not re-imported');
// 노션 휴지통 실패 → /work/ 에서 안 지움
const arch = notion.archive; notion.archive = async () => { throw new Error('x'); };
assert.equal((await call('POST', { op: 'delete', id: n.id })).code, 502); notion.archive = arch;
// sync 없이도 그대로
const h0 = createHandler(store, { CHECKLIST_PASSWORD: 'pw' });
let c0; const r0 = { setHeader() {}, status(x) { c0 = x; return r0; }, json() { return r0; } }; await h0({ method: 'POST', headers: { 'x-checklist-pass': 'pw' }, body: { op: 'status', id: n.id, status: 'done' } }, r0); assert.equal(c0, 200);
console.log('sync ok');
