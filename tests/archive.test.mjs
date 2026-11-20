// 아카이브 — 끝내지 않은 고민 · 생각을 치워 두기. 흐름 · 오늘 칸 · 추천에서 빠지고 ?arc=1 로 보고 꺼낸다
import assert from 'node:assert/strict';
import { createMeHandler } from '../api/_me-core.js';
import { buildWeekly } from '../api/_me-digest.js';
import { kst, addDays } from '../api/_me-habit.js';
import { fakeNotion, memStore } from './fake.mjs';
const env = { NOTION_TOKEN: 'x', ME_PASSWORD: 'pw', INBOX_SINCE: '2000-01-01' };
const h = createMeHandler({ notion: fakeNotion(), store: memStore(), dbId: 'db' }, env);
const call = async (method, body, url = '/api/me/') => { let code, out; const res = { setHeader() {}, status(c) { code = c; return res; }, json(j) { out = j; return res; } }; await h({ method, url, headers: { 'x-checklist-pass': 'pw' }, body }, res); return { code, out }; };
const today = kst();
let r = await call('GET');
const area = r.out.areas[0].key;
const add = async (title, f) => { r = await call('POST', { op: 'add', item: { title, area, ...f } }); return r.out.items.find((i) => i.title === title).id; };
const g = await add('가격 고민', { kind: '고민', due: addDays(today, -5) });
const w = await add('지난 생각', { due: addDays(today, -1) });
// 서랍에서 아카이브로 → 목록 · 오늘 칸에서 빠짐
r = await call('POST', { op: 'update', id: g, fields: { arc: true } });
assert.ok(!r.out.items.some((i) => i.id === g));
r = await call('GET', undefined, '/api/me/?scope=today');
assert.ok(![...r.out.watch, ...r.out.revisit, ...r.out.suggest].some((i) => i.id === g), '오늘 칸 · 추천에서 빠짐');
// 오늘 챙길 것에서 아카이브로
r = await call('POST', { op: 'watch', id: w, result: 'archive' }, '/api/me/?scope=today');
assert.ok(!r.out.watch.some((i) => i.id === w));
// ?arc=1 이면 보이고, 꺼낼 수 있다
r = await call('GET', undefined, '/api/me/?all=1&arc=1');
assert.equal(r.out.items.find((i) => i.id === g).arc, true);
assert.match(r.out.items.find((i) => i.id === g).log.at(-1).text, /아카이브로/);
assert.match(r.out.items.find((i) => i.id === w).log.at(-1).text, /아카이브로/);
r = await call('POST', { op: 'update', id: g, fields: { arc: false } }, '/api/me/?all=1&arc=1');
assert.equal(r.out.items.find((i) => i.id === g).arc, false);
assert.match(r.out.items.find((i) => i.id === g).log.at(-1).text, /아카이브에서 꺼냄/);
assert.ok((await call('GET')).out.items.some((i) => i.id === g));
// 주간 메일에 아카이브에 둔 고민 · 생각
const t = { today, revisit: [], stats: { week: 0, streak: 0 } };
const m = buildWeekly(t, [], [{ key: area, name: 'J&C' }], {}, [{ id: 'z', title: '레슨비 체계', area, status: 'todo', kind: '고민' }]);
assert.match(m.html, /아카이브에 둔 고민/); assert.match(m.html, /레슨비 체계/);
// 다시 정할 일에서 아카이브로
const old = await add('오래 밀린 생각', { due: addDays(today, -6) });
r = await call('GET', undefined, '/api/me/?scope=today');
assert.ok(r.out.revisit.some((i) => i.id === old));
r = await call('POST', { op: 'revisit', id: old, archive: true }, '/api/me/?scope=today');
assert.ok(!r.out.revisit.some((i) => i.id === old));
assert.equal((await call('GET', undefined, '/api/me/?arc=1')).out.items.find((i) => i.id === old).arc, true);
