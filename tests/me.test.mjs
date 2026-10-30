import assert from 'node:assert/strict';
import { createMeHandler } from '../api/_me-core.js';
import { fakeNotion, memStore } from './fake.mjs';
const env = { NOTION_TOKEN: 'x', ME_PASSWORD: 'pw', CHECKLIST_AGENT_TOKEN: 'agent' };
const notion = fakeNotion(), store = memStore();
const h = createMeHandler({ notion, store, dbId: 'db' }, env);
async function call(method, body, headers = { 'x-checklist-pass': 'pw' }, url = '/api/me/') {
  let code = 0, out; const res = { setHeader() {}, status(c) { code = c; return res; }, json(j) { out = j; return res; } };
  await h({ method, url, headers, body }, res); return { code, out };
}
let r = await call('GET', undefined, {}); assert.equal(r.code, 401);
r = await call('GET', undefined, { authorization: 'Bearer agent' }); assert.equal(r.code, 200); assert.equal(r.out.me, 'Claude');
r = await call('GET');
assert.equal(r.code, 200);
assert.deepEqual(r.out.areas.map((a) => a.name), ['J&C · 수업·레슨', 'J&C · 수납·급여', 'KBA', '개인 · 가족']);
const titles = r.out.items.map((i) => i.title).sort();
assert.deepEqual(titles, ['겨울 특강 시간표', '급여정산', '대회 결과보고서'], 'only 분야-set, not 안함, recent done');
const by = (t) => r.out.items.find((i) => i.title === t);
assert.equal(by('급여정산').due, '2026-10-24'); assert.equal(by('급여정산').start, '');
assert.equal(by('겨울 특강 시간표').start, '2026-10-18'); assert.equal(by('겨울 특강 시간표').due, '2026-10-22'); assert.equal(by('겨울 특강 시간표').status, 'doing');
assert.equal(by('대회 결과보고서').start, '2026-10-20'); assert.equal(by('대회 결과보고서').due, '2026-10-31');
assert.ok(by('급여정산').url.startsWith('https://')); assert.ok(!('_hasDeadline' in by('급여정산')));
const kba = r.out.areas.find((a) => a.name === 'KBA');
// add
r = await call('POST', { op: 'add', item: { title: 'KBA 이사회 자료', area: kba.key, status: 'doing', start: '2026-10-20', due: '2026-10-25', note: '초안' } });
assert.equal(r.code, 200);
const added = r.out.items.find((i) => i.title === 'KBA 이사회 자료');
assert.ok(added.id.startsWith('pg-')); assert.equal(added.area, kba.key); assert.equal(added.note, '초안');
const cr = notion.calls.find((c) => c[0] === 'create')[1];
assert.deepEqual(cr['날짜'], { date: { start: '2026-10-20', end: '2026-10-25' } }); assert.equal(cr['시작'].checkbox, true); assert.equal(cr['분야'].select.name, 'KBA');
// reload → note persisted via meta, status from notion
r = await call('GET'); const again = r.out.items.find((i) => i.id === added.id);
assert.equal(again.note, '초안'); assert.equal(again.status, 'doing'); assert.equal(again.log.at(-1).text, '추가');
// status
r = await call('POST', { op: 'status', id: added.id, status: 'done' });
assert.equal(notion.pages.get(added.id).properties['완료'].checkbox, true); assert.equal(notion.pages.get(added.id).properties['시작'].checkbox, false);
// update: dates on deadline item → 데드라인 used
const rep = by('대회 결과보고서');
r = await call('POST', { op: 'update', id: rep.id, fields: { due: '2026-11-02', deps: [added.id], note: '심사표 받으면' } });
let u = notion.calls.filter((c) => c[0] === 'update').at(-1)[2];
assert.deepEqual(u['데드라인'], { date: { start: '2026-11-02' } }); assert.deepEqual(u['날짜'], { date: { start: '2026-10-20' } });
r = await call('GET'); const rep2 = r.out.items.find((i) => i.id === rep.id);
assert.equal(rep2.due, '2026-11-02'); assert.deepEqual(rep2.deps, [added.id]); assert.equal(rep2.note, '심사표 받으면'); assert.match(rep2.log.at(-1).text, /마감일/);
// meta-only update doesn't call notion
const before = notion.calls.length;
await call('POST', { op: 'update', id: rep.id, fields: { detail: '보고서 설명' } });
assert.equal(notion.calls.filter((c, i) => i >= before && c[0] === 'update').length, 0);
// 메모는 길게 (5000자까지)
const longNote = '진행 상황 '.repeat(400);
r = await call('POST', { op: 'update', id: rep.id, fields: { note: longNote } });
assert.equal(r.out.items.find((i) => i.id === rep.id).note, longNote.trim());
// 다음 할 일: 이 일을 선행으로 건 새 업무
r = await call('POST', { op: 'add', item: { title: '결과 공유', area: kba.key, deps: [rep.id] } });
assert.deepEqual(r.out.items.find((i) => i.title === '결과 공유').deps, [rep.id]);
// clear dates on single-date item
await call('POST', { op: 'update', id: by('급여정산').id, fields: { due: '' } });
u = notion.calls.filter((c) => c[0] === 'update').at(-1)[2]; assert.deepEqual(u['날짜'], { date: null });
// area move
const lesson = r.out.areas[0].key;
await call('POST', { op: 'update', id: rep.id, fields: { area: lesson } });
assert.equal(notion.pages.get(rep.id).properties['분야'].select.name, 'J&C · 수업·레슨');
// delete strips deps
r = await call('POST', { op: 'delete', id: added.id });
assert.equal(notion.pages.get(added.id).archived, true);
assert.deepEqual(r.out.items.find((i) => i.id === rep.id).deps, []);
assert.ok(!(added.id in store.peek().meta));
// areas/import blocked
r = await call('POST', { op: 'areas', areas: [{ name: 'x' }] }); assert.equal(r.code, 409);
// not configured
const h2 = createMeHandler({ notion, store, dbId: 'db' }, { ME_PASSWORD: 'pw' });
let code; const res2 = { setHeader() {}, status(c) { code = c; return res2; }, json(j) { res2.out = j; return res2; } };
await h2({ method: 'GET', headers: {} }, res2); assert.equal(code, 503); assert.deepEqual(res2.out.missing, ['notion']);
// notion 404 → setup hint
const bad = { ...notion, database: async () => { const e = new Error('nf'); e.status = 404; throw e; } };
const h3 = createMeHandler({ notion: bad, store, dbId: 'db' }, env);
await h3({ method: 'GET', headers: { 'x-checklist-pass': 'pw' } }, res2); assert.equal(code, 503); assert.deepEqual(res2.out.missing, ['notion_share']);
// ?all=1 → 오래된 완료도
{ const r1 = await call('GET', undefined, undefined, '/api/me/?all=1'); assert.ok(r1.out.items.some((i) => i.title === '예전 완료'), 'old done with all=1');
  const r2 = await call('GET'); assert.ok(!r2.out.items.some((i) => i.title === '예전 완료')); }
console.log('me core: all ok');
// 태그
{
  const r1 = await call('GET'); assert.deepEqual(r1.out.tags.map((t) => t.name), ['높음', '경연대회', '가족']);
  const it = r1.out.items[0];
  await call('POST', { op: 'update', id: it.id, fields: { tag: '경연대회' } });
  assert.equal(notion.pages.get(it.id).properties['태그'].select.name, '경연대회');
  let r2 = await call('GET'); assert.equal(r2.out.items.find((i) => i.id === it.id).tag, '경연대회'); assert.match(r2.out.items.find((i) => i.id === it.id).log.at(-1).text, /태그/);
  await call('POST', { op: 'update', id: it.id, fields: { tag: '없는태그' } }); // 무시
  assert.equal(notion.pages.get(it.id).properties['태그'].select.name, '경연대회');
  await call('POST', { op: 'update', id: it.id, fields: { tag: '' } });
  assert.equal(notion.pages.get(it.id).properties['태그'].select, null);
  const r3 = await call('POST', { op: 'add', item: { title: '태그 붙은 새 일', area: r1.out.areas[0].key, tag: '높음' } });
  assert.equal(r3.out.items.find((i) => i.title === '태그 붙은 새 일').tag, '높음');
  console.log('tags ok');
}
