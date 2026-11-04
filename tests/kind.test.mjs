// 종류(행동 · 정하기 · 고민 · 쪼개기 · 기다리기) — 노션 '종류' 칸 읽기 · 쓰기, 오늘의 3가지 추천, 주간 메일
import assert from 'node:assert/strict';
import { createMeHandler, KINDS } from '../api/_me-core.js';
import { suggestTop } from '../api/_me-habit.js';
import { buildWeekly } from '../api/_me-digest.js';
import { fakeNotion, memStore } from './fake.mjs';

const notion = fakeNotion();
const h = createMeHandler({ notion, store: memStore(), dbId: 'db' }, { NOTION_TOKEN: 'x', ME_PASSWORD: 'pw' });
const call = async (method, body) => { let code, out; const res = { setHeader() {}, status(c) { code = c; return res; }, json(j) { out = j; return res; } }; await h({ method, url: '/api/me/', headers: { 'x-checklist-pass': 'pw' }, body }, res); return { code, out }; };

let r = await call('GET');
assert.deepEqual(r.out.kinds, KINDS);
const area = r.out.areas[0].key;
// 새 업무에 종류 → 노션 '종류' 선택
r = await call('POST', { op: 'add', item: { title: '요금제 정하기', area, kind: '정하기' } });
const dec = r.out.items.find((i) => i.title === '요금제 정하기');
assert.equal(dec.kind, '정하기');
assert.deepEqual(notion.calls.filter((c) => c[0] === 'create').at(-1)[1]['종류'], { select: { name: '정하기' } });
// 이상한 값은 버린다
r = await call('POST', { op: 'add', item: { title: '아무거나', area, kind: '엉뚱' } });
assert.equal(r.out.items.find((i) => i.title === '아무거나').kind, '');
// 바꾸기 · 지우기 + 기록
r = await call('POST', { op: 'update', id: dec.id, fields: { kind: '고민' } });
assert.equal(r.out.items.find((i) => i.id === dec.id).kind, '고민');
assert.match(r.out.items.find((i) => i.id === dec.id).log.at(-1).text, /종류/);
r = await call('POST', { op: 'update', id: dec.id, fields: { kind: '' } });
assert.equal(r.out.items.find((i) => i.id === dec.id).kind, '');
assert.deepEqual(notion.calls.filter((c) => c[0] === 'update').at(-1)[2]['종류'], { select: null });

// 오늘의 3가지 추천: 행동 · 종류 없음만
const it = (title, kind) => ({ id: title, title, kind, status: 'todo', due: '2026-11-04', start: '', area });
const picks = suggestTop(['행동', '', '정하기', '고민', '쪼개기', '기다리기'].map((k) => it(k || '없음', k)), '2026-11-05').map((i) => i.title);
assert.deepEqual(picks.sort(), ['없음', '행동'].sort());

// 주간 메일: 정할 것 · 고민 · 기다리는 것
const t = { today: '2026-11-08', stats: { week: 0, streak: 0 }, revisit: [] };
const wk = buildWeekly(t, [it('가입 방식', '정하기'), it('서비스 정교화', '고민'), it('알림톡 심사', '기다리기'), { ...it('끝난 고민', '고민'), status: 'done' }], [{ key: area, name: 'Stagelogic' }], {});
assert.match(wk.html, /정할 것 1/); assert.match(wk.html, /고민 중인 것 1/); assert.match(wk.html, /기다리는 것 1/);
assert.ok(!wk.html.includes('끝난 고민'));
console.log('kind ok');
