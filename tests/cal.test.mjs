import assert from 'node:assert/strict';
import { buildIcs, calKey, calUrl, createMeCalHandler } from '../api/_me-cal.js';
import { createMeHandler } from '../api/_me-core.js';
import { fakeNotion, memStore } from './fake.mjs';
const areas = [{ key: 'a1', name: 'J&C' }, { key: 'a2', name: 'Stagelogic' }];
const long = '아주 긴 제목 '.repeat(12);
const ics = buildIcs([
  { id: 'p1', title: '로고 확정, 시안; 정리', area: 'a2', status: 'todo', start: '', due: '2026-10-21', url: 'https://notion.so/p1' },
  { id: 'p2', title: '기간 일', area: 'a1', status: 'done', start: '2026-10-20', due: '2026-10-24' },
  { id: 'p3', title: '날짜 없음', area: 'a1', status: 'todo', start: '', due: '' },
  { id: 'p4', title: long, area: 'a1', status: 'todo', start: '2026-11-01', due: '' },
], areas, new Date('2026-10-20T00:00:00Z'));
assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3, 'only dated items');
assert.match(ics, /DTSTART;VALUE=DATE:20261021\r\nDTEND;VALUE=DATE:20261022/);
assert.ok(ics.includes('SUMMARY:[Stagelogic] 로고 확정\\, 시안\\; 정리\r\n'), 'escaped');
assert.match(ics, /DTSTART;VALUE=DATE:20261020\r\nDTEND;VALUE=DATE:20261025/);
assert.match(ics, /SUMMARY:✓ \[J&C\] 기간 일/);
assert.match(ics, /DTSTART;VALUE=DATE:20261101\r\nDTEND;VALUE=DATE:20261102/, 'start only → that day');
for (const l of ics.split('\r\n')) assert.ok(Buffer.byteLength(l) <= 75, 'folded: ' + l);
// 키
assert.equal(calKey('pw'), calKey('pw')); assert.notEqual(calKey('pw'), calKey('pw2')); assert.equal(calKey('pw').length, 32);
assert.match(calUrl('pw'), /^https:\/\/www\.stagelogic\.kr\/api\/me-cal\/\?k=[0-9a-f]{32}$/);
// 핸들러
const env = { NOTION_TOKEN: 'x', ME_PASSWORD: 'pw' };
const service = { async loadAll() { return { items: [{ id: 'x', title: 't', area: 'a1', status: 'todo', start: '', due: '2026-10-22' }], areas }; } };
const h = createMeCalHandler({ service, env });
const run = async (url) => { let code, out, ct; const res = { setHeader(k, v) { if (k === 'Content-Type') ct = v; return res; }, status(c) { code = c; return res; }, send(t) { out = t; return res; } }; await h({ method: 'GET', url, query: Object.fromEntries(new URL(url, 'http://x').searchParams) }, res); return { code, out, ct }; };
assert.equal((await run('/api/me-cal/?k=bad')).code, 401);
assert.equal((await run('/api/me-cal/')).code, 401);
const ok = await run('/api/me-cal/?k=' + calKey('pw')); assert.equal(ok.code, 200); assert.match(ok.ct, /text\/calendar/); assert.match(ok.out, /SUMMARY:\[J&C\] t/);
// /api/me/?scope=calendar 는 비밀번호가 있어야 주소를 준다
const mh = createMeHandler({ notion: fakeNotion(), store: memStore(), dbId: 'db' }, { NOTION_TOKEN: 'x', ME_PASSWORD: 'pw' });
const call = async (pass) => { let code, out; const res = { setHeader() {}, status(c) { code = c; return res; }, json(j) { out = j; return res; } }; await mh({ method: 'GET', url: '/api/me/?scope=calendar', headers: { 'x-checklist-pass': pass } }, res); return { code, out }; };
assert.equal((await call('nope')).code, 401);
const c = await call('pw'); assert.equal(c.code, 200); assert.equal(c.out.url, calUrl('pw'));
console.log('cal ok');
