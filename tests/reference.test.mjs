// 레퍼런스 = 노션 GTD System 의 Reference. 끝내지 않은 고민 · 생각도 치워 두기
// 흐름 · 오늘 칸 · 추천에서 빠지고, 오늘 칸 '보관한 고민 · 생각'과 ?arc=1 로 보고 꺼낸다
import assert from 'node:assert/strict';
import { createMeHandler } from '../api/_me-core.js';
import { buildWeekly } from '../api/_me-digest.js';
import { GTD_IDS } from '../api/_me-areas.js';
import { kst, addDays } from '../api/_me-habit.js';
import { fakeNotion, memStore } from './fake.mjs';
const env = { NOTION_TOKEN: 'x', ME_PASSWORD: 'pw', INBOX_SINCE: '2000-01-01' };
const notion = fakeNotion();
const h = createMeHandler({ notion, store: memStore(), dbId: 'db' }, env);
const call = async (method, body, url = '/api/me/') => { let code, out; const res = { setHeader() {}, status(c) { code = c; return res; }, json(j) { out = j; return res; } }; await h({ method, url, headers: { 'x-checklist-pass': 'pw' }, body }, res); return { code, out }; };
const today = kst();
let r = await call('GET');
const area = r.out.areas[0].key;
const add = async (title, f) => { r = await call('POST', { op: 'add', item: { title, area, ...f } }); return r.out.items.find((i) => i.title === title).id; };
const g = await add('가격 고민', { kind: '고민', due: addDays(today, -5), note: '9,900 / 27,900' });
const w = await add('지난 생각', { due: addDays(today, -1) });
// 서랍에서 레퍼런스로 → Reference 페이지(제목 · 메모)를 만들고 이어 둠, 목록 · 오늘 칸에서 빠짐
r = await call('POST', { op: 'update', id: g, fields: { arc: true } });
assert.ok(!r.out.items.some((i) => i.id === g));
const made = notion.calls.filter((c) => c[0] === 'create' && c[2] === GTD_IDS.gtd).at(-1);
assert.equal(made[1].Action.title[0].text.content, '가격 고민');
assert.match(made[3][0].paragraph.rich_text[0].text.content, /27,900/);
const refPage = [...notion.pages.values()].find((p) => p.db === GTD_IDS.gtd && p.properties.Action.title[0].plain_text === '가격 고민');
assert.ok(notion.pages.get(g).properties['GTD System'].relation.some((x) => x.id === refPage.id));
r = await call('GET', undefined, '/api/me/?scope=today');
assert.ok(![...r.out.watch, ...r.out.revisit, ...r.out.suggest].some((i) => i.id === g), '오늘 칸 · 추천에서 빠짐');
// 오늘 칸 '보관한 고민 · 생각': 레퍼런스한 일 + 할 일과 안 이어진 Reference
assert.equal(r.out.kept[0].id, g); assert.equal(r.out.kept[0].note, '9,900 / 27,900');
assert.ok(r.out.kept.some((i) => i.ref && i.title === '정체성에 대하여'));
assert.ok(!r.out.kept.some((i) => i.ref && i.title === '가격 고민'), '이어진 Reference 는 한 번만');
// 오늘 챙길 것에서 레퍼런스로
r = await call('POST', { op: 'watch', id: w, result: 'archive' }, '/api/me/?scope=today');
assert.ok(!r.out.watch.some((i) => i.id === w)); assert.ok(r.out.kept.some((i) => i.id === w));
// ?arc=1 이면 보이고(refs 도), 꺼내면 만든 Reference 페이지는 휴지통으로
r = await call('GET', undefined, '/api/me/?all=1&arc=1');
assert.equal(r.out.items.find((i) => i.id === g).arc, true);
assert.ok(r.out.refs.some((i) => i.title === '정체성에 대하여'));
assert.match(r.out.items.find((i) => i.id === g).log.at(-1).text, /레퍼런스로/);
r = await call('POST', { op: 'update', id: g, fields: { arc: false } }, '/api/me/?all=1&arc=1');
assert.equal(r.out.items.find((i) => i.id === g).arc, false);
assert.equal(refPage.archived, true);
assert.deepEqual(notion.pages.get(g).properties['GTD System'].relation, []);
assert.ok((await call('GET')).out.items.some((i) => i.id === g));
// 다시 정할 일에서 레퍼런스로
const old = await add('오래 밀린 생각', { due: addDays(today, -6) });
r = await call('GET', undefined, '/api/me/?scope=today');
assert.ok(r.out.revisit.some((i) => i.id === old));
r = await call('POST', { op: 'revisit', id: old, archive: true }, '/api/me/?scope=today');
assert.ok(!r.out.revisit.some((i) => i.id === old));
assert.equal((await call('GET', undefined, '/api/me/?arc=1')).out.items.find((i) => i.id === old).arc, true);
// 주간 메일에 레퍼런스에 둔 고민 · 생각
const t = { today, revisit: [], stats: { week: 0, streak: 0 } };
const m = buildWeekly(t, [], [{ key: area, name: 'J&C' }], {}, [{ id: 'z', title: '레슨비 체계', area, status: 'todo', kind: '고민' }]);
assert.match(m.html, /레퍼런스에 둔 고민/); assert.match(m.html, /레슨비 체계/);
