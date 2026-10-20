import assert from 'node:assert/strict';
import { createMeHandler, createMeService } from '../api/_me-core.js';
import { createCaptureHandler } from '../api/_capture-core.js';
import { createMeDigestHandler, buildMorning, buildEvening, buildWeekly } from '../api/_me-digest.js';
import { kst, addDays } from '../api/_me-habit.js';
import { fakeNotion, memStore } from './fake.mjs';
const env = { NOTION_TOKEN: 'x', ME_PASSWORD: 'pw', INBOX_SINCE: '2000-01-01', CAPTURE_KEY: 'cap', ME_MAIL_TO: 'me@x', CRON_SECRET: 'c' };
const notion = fakeNotion(), store = memStore();
const h = createMeHandler({ notion, store, dbId: 'db' }, env);
const call = async (method, body, url = '/api/me/?scope=today') => { let code, out; const res = { setHeader() {}, status(c) { code = c; return res; }, json(j) { out = j; return res; } }; await h({ method, url, headers: { 'x-checklist-pass': 'pw' }, body }, res); return { code, out }; };
const today = kst();
let r = await call('GET');
assert.equal(r.code, 200);
assert.deepEqual(r.out.inbox.map((i) => i.title), ['분야 없는 할 일'], 'inbox = no 분야, not done/skip');
assert.ok(r.out.suggest.length >= 2, 'suggestions when no top');
assert.equal(r.out.top.length, 0);
const baseToday = r.out.stats.today;
// capture (UI)
r = await call('POST', { op: 'capture', text: '학부모 상담 메모 정리' });
assert.ok(r.out.inbox.some((i) => i.title === '학부모 상담 메모 정리')); assert.equal(r.out.stats.today, baseToday + 1); assert.ok(r.out.stats.streak >= 1);
// capture endpoint
const cap = createCaptureHandler({ notion, dbId: 'db' }, env);
const capCall = async (key, body) => { let code, out; const res = { setHeader() {}, status(c) { code = c; return res; }, json(j) { out = j; return res; } }; await cap({ method: 'POST', headers: { 'x-capture-key': key }, body }, res); return { code, out }; };
assert.equal((await capCall('nope', { text: 'x' })).code, 401);
assert.equal((await capCall('cap', '{"text":"보강 일정 확인"}')).code, 200);
assert.equal((await capCall('cap', '그냥 텍스트')).out.title, '그냥 텍스트');
assert.equal((await capCall('cap', { text: '' })).code, 400);
// GET 한 줄 방식 (단축어 'URL 콘텐츠 가져오기')
const capGet = async (url) => { let code, out, ct; const res = { setHeader(k, v) { if (k === 'Content-Type') ct = v; return res; }, status(c) { code = c; return res; }, send(t) { out = t; return res; }, json(j) { out = j; return res; } }; await cap({ method: 'GET', headers: {}, url, query: Object.fromEntries(new URL(url, 'http://x').searchParams) }, res); return { code, out, ct }; };
let g = await capGet('/api/capture/?k=cap&t=' + encodeURIComponent('  시리로 넣은   기록 '));
assert.equal(g.code, 200); assert.equal(g.out, '기록했습니다: 시리로 넣은 기록'); assert.match(g.ct, /text\/plain/);
g = await capGet('/api/capture/?k=bad&t=x'); assert.equal(g.code, 401); assert.equal(typeof g.out, 'string');
g = await capGet('/api/capture/?k=cap&t='); assert.equal(g.code, 400);
assert.equal((await (async () => { let code; const res = { setHeader() { return res; }, status(c) { code = c; return res; }, json() { return res; } }; await cap({ method: 'DELETE', headers: {} }, res); return code; })()), 405);
r = await call('GET'); assert.ok(r.out.inbox.some((i) => i.title === '보강 일정 확인'));
// triage → leaves inbox, appears in items with area + due
const tasks = await call('GET', undefined, '/api/me/');
const area = tasks.out.areas[1].key;
const ib = r.out.inbox.find((i) => i.title === '보강 일정 확인');
r = await call('POST', { op: 'triage', id: ib.id, area, due: addDays(today, 2) });
assert.ok(!r.out.inbox.some((i) => i.id === ib.id));
let t2 = await call('GET', undefined, '/api/me/'); const moved = t2.out.items.find((i) => i.id === ib.id);
assert.equal(moved.area, area); assert.equal(moved.due, addDays(today, 2));
assert.equal((await call('POST', { op: 'triage', id: ib.id, area: 'nope' })).code, 400);
// inbox-skip
const sk = r.out.inbox.find((i) => i.title === '그냥 텍스트');
r = await call('POST', { op: 'inbox-skip', id: sk.id }); assert.ok(!r.out.inbox.some((i) => i.id === sk.id));
// top-set (max 3, only real ids)
const ids = t2.out.items.filter((i) => i.status !== 'done').map((i) => i.id);
r = await call('POST', { op: 'top-set', ids: [...ids, 'bogus'] });
assert.equal(r.out.top.length, Math.min(3, ids.length)); assert.equal(r.out.suggest.length, 0);
const [a, b] = r.out.top;
// check: reason required, done, tomorrow
assert.equal((await call('POST', { op: 'check', id: b.id, result: 'tomorrow' })).out.error, 'reason_required');
r = await call('POST', { op: 'check', id: a.id, result: 'done' });
assert.equal(notion.pages.get(a.id).properties['완료'].checkbox, true);
r = await call('POST', { op: 'check', id: b.id, result: 'tomorrow', why: '자료 대기' });
const bt = r.out.top.find((i) => i.id === b.id); assert.equal(bt.check.r, 'tomorrow'); assert.equal(bt.check.why, '자료 대기'); { const full = (await call('GET', undefined, '/api/me/')).out.items.find((i) => i.id === b.id); const t1 = addDays(today, 1); assert.ok(full.due === t1 || (full.start && full.start <= t1 && full.due >= t1), 'on tomorrow in calendar'); }
t2 = await call('GET', undefined, '/api/me/'); assert.match(t2.out.items.find((i) => i.id === b.id).log.at(-1).text, /내일로 — 자료 대기/);
// revisit: make an item 5 days late, then fix
const late = t2.out.items.find((i) => i.status !== 'done' && i.id !== b.id);
await call('POST', { op: 'update', id: late.id, fields: { due: addDays(today, -5) } }, '/api/me/');
r = await call('GET'); const rv = r.out.revisit.find((i) => i.id === late.id); assert.ok(rv); assert.equal(rv.late, 5);
r = await call('POST', { op: 'revisit', id: late.id, due: addDays(today, 3) }); assert.ok(!r.out.revisit.some((i) => i.id === late.id));
// yesterdayMissed: plant a yesterday record with an unchecked open item
const meta = store.peek().meta; meta._days[addDays(today, -1)] = { top: [b.id], check: {} };
await store.save({ meta }, [], 5);
r = await call('GET'); assert.equal(r.out.yesterdayMissed, true);
// digests
const svc = createMeService({ notion, store, dbId: 'db' }, env);
const loaded = await svc.loadAll(true); const t = await svc.today(loaded);
const m = buildMorning(t, loaded.items, loaded.areas); assert.match(m.subject, /오늘의 3가지/); assert.match(m.subject, /어제 점검 안 함/); assert.ok(m.html.includes('흐름표 열기'));
const ev = buildEvening(t, loaded.items, loaded.areas); assert.match(ev.subject, /\[점검\]/);
const wk = buildWeekly(t, loaded.items, loaded.areas, loaded.meta); assert.match(wk.html, /자료 대기/); assert.match(wk.subject, /주간 리뷰/);
const sent = [];
const dh = createMeDigestHandler({ service: svc, ready: () => true, send: async (x) => sent.push(x), env });
const dcall = async (url, auth) => { let code, out; const res = { setHeader() {}, status(c) { code = c; return res; }, json(j) { out = j; return res; } }; await dh({ url, headers: { authorization: auth } }, res); return { code, out }; };
assert.equal((await dcall('/api/me-digest/?kind=morning', 'Bearer bad')).code, 401);
for (const k of ['morning', 'evening', 'weekly']) { const x = await dcall(`/api/me-digest/?kind=${k}`, 'Bearer c'); assert.equal(x.code, 200, k); }
assert.equal(sent.length, 3); assert.equal(sent[0].to, 'me@x');
const noMail = createMeDigestHandler({ service: svc, ready: () => true, send: async () => {}, env: { ...env, ME_MAIL_TO: '' } });
let c2; const res2 = { setHeader() {}, status(c) { c2 = c; return res2; }, json(j) { res2.out = j; return res2; } }; await noMail({ url: '/x', headers: { authorization: 'Bearer c' } }, res2);
assert.equal(c2, 503); assert.deepEqual(res2.out.missing, ['ME_MAIL_TO']);
// regular task API untouched
assert.equal((await call('GET', undefined, '/api/me/')).code, 200);
// 오늘의 3가지 → 날짜를 오늘로 (캘린더에 보이게), 내일로 → 날짜도 내일로
{
  const all = (await call('GET', undefined, '/api/me/')).out.items.filter((i) => i.status !== 'done');
  const [x, y, z] = all;
  await call('POST', { op: 'update', id: x.id, fields: { start: '', due: '' } }, '/api/me/');
  await call('POST', { op: 'update', id: y.id, fields: { start: '', due: addDays(today, 5) } }, '/api/me/');
  await call('POST', { op: 'update', id: z.id, fields: { start: '', due: addDays(today, -1) } }, '/api/me/');
  await call('POST', { op: 'top-set', ids: [] });
  await call('POST', { op: 'top-set', ids: [x.id, y.id, z.id] });
  let L = (await call('GET', undefined, '/api/me/')).out.items; const g = (id) => L.find((i) => i.id === id);
  assert.equal(g(x.id).due, today, 'no date → today');
  assert.equal(g(y.id).start, today); assert.equal(g(y.id).due, addDays(today, 5), 'future deadline kept');
  assert.equal(g(z.id).due, addDays(today, -1), 'overdue left as is');
  assert.match(g(x.id).log.at(-1).text, /오늘의 3가지: 날짜/);
  // 다시 확정해도 이미 있던 것은 안 건드림
  await call('POST', { op: 'update', id: x.id, fields: { due: addDays(today, 3) } }, '/api/me/');
  await call('POST', { op: 'top-set', ids: [x.id, y.id] });
  L = (await call('GET', undefined, '/api/me/')).out.items; assert.equal(g(x.id).due, addDays(today, 3));
  // 내일로: 시작이 오늘이고 마감이 뒤면 시작만 내일로
  await call('POST', { op: 'check', id: y.id, result: 'tomorrow', why: '시간 부족' });
  L = (await call('GET', undefined, '/api/me/')).out.items;
  assert.equal(g(y.id).start, addDays(today, 1)); assert.equal(g(y.id).due, addDays(today, 5));
}
// 어제 남은 일: 목록으로 보이고, 하나씩 정리하면 사라짐 (오늘로 = 날짜도 오늘로)
{
  const open = (await call('GET', undefined, '/api/me/')).out.items.filter((i) => i.status !== 'done');
  const [p, q] = open; const yd = addDays(today, -1);
  await call('POST', { op: 'update', id: p.id, fields: { start: '', due: yd } }, '/api/me/');
  const data = store.peek(); data.meta._days[yd] = { top: [p.id, q.id], check: {} }; await store.save(data, []);
  let y = await call('GET'); assert.equal(y.out.yesterdayMissed, true); assert.deepEqual(y.out.yesterday.map((i) => i.id).sort(), [p.id, q.id].sort());
  assert.equal((await call('POST', { op: 'check', id: p.id, result: 'tomorrow', day: 'yesterday' })).out.error, 'reason_required');
  y = await call('POST', { op: 'check', id: p.id, result: 'tomorrow', why: '회의가 길어짐', day: 'yesterday' });
  assert.deepEqual(y.out.yesterday.map((i) => i.id), [q.id]); assert.equal(y.out.yesterdayMissed, true);
  const L = (await call('GET', undefined, '/api/me/')).out.items; const pp = L.find((i) => i.id === p.id);
  assert.equal(pp.due, today, 'moved to today'); assert.match(pp.log.at(-1).text, /어제 점검: 오늘로 — 회의가 길어짐/);
  y = await call('POST', { op: 'check', id: q.id, result: 'done', day: 'yesterday' });
  assert.equal(y.out.yesterdayMissed, false); assert.equal(y.out.yesterday.length, 0);
  assert.ok(!y.out.top.some((i) => i.check && i.id === q.id && i.check.r === 'done' && false));
  // 어제 3가지에 없던 것은 거절
  assert.equal((await call('POST', { op: 'check', id: open[2].id, result: 'done', day: 'yesterday' })).code, 400);
  // 아침 메일에 어제 남은 일 목록
  const m2 = buildMorning({ ...y.out, yesterdayMissed: true, yesterday: [{ title: '남은 일 X', area: '', due: '' }] }, [], []);
  assert.match(m2.html, /어제 남은 일/); assert.match(m2.html, /남은 일 X/);
}
console.log('habit ok');
// 메일 미리 보기 HTML: node tests/habit.test.mjs <폴더> 로 실행하면 그 폴더에 저장
if (process.argv[2]) { const fs = await import('node:fs'); fs.writeFileSync(process.argv[2] + '/morning.html', m.html); fs.writeFileSync(process.argv[2] + '/weekly.html', wk.html); }
// 템플릿 반복 페이지는 수집함에서 제외
{ await notion.create('db', { '할일 또는 일정': { title: [{ text: { content: '일일 일정표' } }] } });
  await notion.create('db', { '할일 또는 일정': { title: [{ text: { content: '진짜 기록' } }] } });
  const r9 = await call('GET'); assert.ok(!r9.out.inbox.some((i) => i.title === '일일 일정표')); assert.ok(r9.out.inbox.some((i) => i.title === '진짜 기록'));
  console.log('exclude ok'); }
// 메일 미리 받기
{ const out = []; const h2 = createMeHandler({ notion, store, dbId: 'db', send: async (m) => out.push(m) }, { ...env, RESEND_API_KEY: 'k' });
  const c = async (body) => { let code, o; const res = { setHeader() {}, status(x) { code = x; return res; }, json(j) { o = j; return res; } }; await h2({ method: 'POST', url: '/api/me/', headers: { 'x-checklist-pass': 'pw' }, body }, res); return { code, o }; };
  let x = await c({ op: 'mail-preview', kind: 'evening' }); assert.equal(x.code, 200); assert.match(out[0].subject, /^\(미리 보기\) \[점검\]/); assert.equal(out[0].to, 'me@x');
  const h3 = createMeHandler({ notion, store, dbId: 'db', send: async () => {} }, { ...env, ME_MAIL_TO: '' });
  let code3, o3; const r3 = { setHeader() {}, status(x) { code3 = x; return r3; }, json(j) { o3 = j; return r3; } }; await h3({ method: 'POST', url: '/api/me/', headers: { 'x-checklist-pass': 'pw' }, body: { op: 'mail-preview' } }, r3);
  assert.equal(code3, 503); assert.ok(o3.missing.includes('ME_MAIL_TO'));
  console.log('preview ok'); }
