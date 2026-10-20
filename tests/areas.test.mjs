import assert from 'node:assert/strict';
import { createMeHandler } from '../api/_me-core.js';
import { GTD_IDS } from '../api/_me-areas.js';
import { memStore } from './fake.mjs';
const T = (s) => ({ type: 'title', title: [{ plain_text: s }] }); const rel = (...x) => ({ relation: x.map((id) => ({ id })) });
const db = {
  [GTD_IDS.areas]: [{ id: 'A1', url: 'u/A1', properties: { Name: T('J&C 학원 운영') } }, { id: 'A2', url: 'u/A2', properties: { Name: T('Health & Fitness') } }],
  [GTD_IDS.lists]: [['L1', 'Projects'], ['L2', 'Next actions'], ['L3', 'Waiting for'], ['L4', 'Reference']].map(([id, n]) => ({ id, properties: { Name: T(n) } })),
  [GTD_IDS.gtd]: [
    { id: 'G1', url: 'u/G1', properties: { Action: T('겨울 특강'), 완료: { checkbox: false }, GTD: rel('L1'), 'Related Area': rel('A1'), 'Due date': { date: { start: '2026-11-15' } }, Priority: { select: { name: 'High' } } } },
    { id: 'G2', url: 'u/G2', properties: { Action: T('대관 답변'), 완료: { checkbox: false }, GTD: rel('L3'), 'Related Area': rel('A1'), 'Due date': { date: null } } },
    { id: 'G3', url: 'u/G3', properties: { Action: T('자료 모음'), 완료: { checkbox: false }, GTD: rel('L4'), 'Related Area': rel('A1') } },
    { id: 'G4', url: 'u/G4', properties: { Action: T('수영'), 완료: { checkbox: false }, GTD: rel('L2'), 'Related Area': rel() } },
    { id: 'G5', url: 'u/G5', properties: { Action: T('끝난 것'), 완료: { checkbox: true }, GTD: rel('L1'), 'Related Area': rel('A2') } },
  ],
  act: [
    { id: 'X1', properties: { 완료: { checkbox: true }, 'GTD System': rel('G1') } },
    { id: 'X2', properties: { 완료: { checkbox: false }, 'GTD System': rel('G1') } },
    { id: 'X3', properties: { 완료: { checkbox: false }, 안함: { checkbox: true }, 'GTD System': rel('G1') } },
  ],
};
const calls = [];
const notion = {
  database: async () => ({ properties: {} }),
  queryAll: async (id, f) => { calls.push(['q', id]); const rows = db[id] || []; if (id === GTD_IDS.gtd) return f ? rows.filter((r) => !r.properties.완료.checkbox) : rows; return rows; },
  update: async (id, pr) => { calls.push(['u', id, pr]); const g = db[GTD_IDS.gtd].find((x) => x.id === id); if (pr['완료']) g.properties.완료 = pr['완료']; return g; },
  create: async (dbid, pr) => { calls.push(['c', dbid, pr]); const id = 'G' + (db[dbid].length + 1); db[dbid].push({ id, url: 'u/' + id, properties: { Action: T(pr.Action.title[0].text.content), 완료: { checkbox: false }, GTD: pr.GTD || rel(), 'Related Area': pr['Related Area'] || rel(), 'Due date': pr['Due date'] || { date: null } } }); return { id }; },
  archive: async () => {},
};
const h = createMeHandler({ notion, store: memStore(), dbId: 'act' }, { NOTION_TOKEN: 'x', ME_PASSWORD: 'pw' });
const call = async (method, body, url = '/api/me/') => { let code, out; const res = { setHeader() {}, status(c) { code = c; return res; }, json(j) { out = j; return res; } }; await h({ method, url, headers: { 'x-checklist-pass': 'pw' }, body }, res); return { code, out }; };
let r = await call('GET', undefined, '/api/me/?scope=areas');
assert.equal(r.code, 200);
assert.deepEqual(r.out.lists.map((l) => l.name), ['Projects', 'Next actions', 'Waiting for']);
const a1 = r.out.areas.find((a) => a.name === 'J&C 학원 운영');
assert.deepEqual(a1.items.map((g) => g.title), ['겨울 특강', '대관 답변'], 'Reference hidden, sorted by list');
assert.deepEqual(a1.items[0].actions, { total: 2, done: 1 }, '안함 excluded');
assert.equal(a1.items[0].due, '2026-11-15'); assert.equal(a1.items[0].priority, 'High');
assert.deepEqual(r.out.areas.find((a) => a.name === 'Health & Fitness').items, []);
assert.deepEqual(r.out.noArea.map((g) => g.title), ['수영']);
// done
r = await call('POST', { op: 'gtd-done', id: 'G2', done: true });
assert.equal(r.code, 200); assert.ok(!r.out.areas.find((a) => a.id === 'A1').items.some((g) => g.id === 'G2'));
// add
r = await call('POST', { op: 'gtd-add', area: 'A2', list: 'L1', title: '건강검진', due: '2026-10-30' });
const added = r.out.areas.find((a) => a.id === 'A2').items[0];
assert.equal(added.title, '건강검진'); assert.equal(added.list, 'Projects'); assert.equal(added.due, '2026-10-30');
r = await call('POST', { op: 'gtd-add', area: 'A2', title: '' }); assert.equal(r.code, 400);
// normal GET still works and didn't hit GTD dbs
calls.length = 0; r = await call('GET'); assert.equal(r.code, 200); assert.ok(!calls.some((c) => c[1] === GTD_IDS.gtd));
// 완료 포함 · 자료 보기
r = await call('GET', undefined, '/api/me/?scope=areas&done=1&refs=1');
assert.ok(r.out.lists.some((l) => l.name === 'Reference'));
const all = [...r.out.areas.flatMap((a) => a.items), ...r.out.noArea];
assert.ok(all.find((g) => g.id === 'G5').done, 'done item present & flagged');
assert.ok(all.find((g) => g.id === 'G2').done, 'G2 (marked done earlier) present');
assert.ok(all.find((g) => g.id === 'G3').ref, 'reference flagged');
const a1b = r.out.areas.find((a) => a.id === 'A1').items; assert.equal(a1b.at(-1).done, true, 'done sorted last');
// 완료 풀기
r = await call('POST', { op: 'gtd-done', id: 'G2', done: false }, '/api/me/?scope=areas&done=1');
assert.equal(db[GTD_IDS.gtd].find((x) => x.id === 'G2').properties.완료.checkbox, false);
assert.equal(r.out.areas.find((a) => a.id === 'A1').items.find((g) => g.id === 'G2').done, false);
// 기본은 여전히 완료 · 자료 숨김
r = await call('GET', undefined, '/api/me/?scope=areas');
assert.ok(!r.out.lists.some((l) => l.name === 'Reference'));
assert.ok(![...r.out.areas.flatMap((a) => a.items)].some((g) => g.done || g.ref));
console.log('areas ok');
