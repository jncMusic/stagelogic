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

// 오늘의 3가지 추천: 고민 · 쪼개기는 빼고, 정하기 · 기다리기는 때가 되면 (여기선 마감 지남이라 들어감)
const it = (title, kind, more = {}) => ({ id: title, title, kind, status: 'todo', due: '2026-11-04', start: '', area, deps: [], ...more });
const picks = suggestTop(['행동', '', '정하기', '고민', '쪼개기', '기다리기'].map((k) => it(k || '없음', k)), '2026-11-05').map((i) => i.title);
assert.deepEqual(picks.sort(), ['없음', '행동', '정하기', '기다리기'].sort());
// 마감이 먼 정하기 · 아직 확인할 날이 안 된 기다리기는 뺀다
assert.equal(suggestTop([it('먼 결정', '정하기', { due: '2026-11-20' }), it('먼 기다림', '기다리기', { due: '2026-11-20' })], '2026-11-05').length, 0);
// 중요한 일이 먼저: 단계(◆)에 묶이고 다른 일이 기다리는 일 > 같은 날 마감인 그냥 일 > 선행이 남은 일
const today = '2026-11-10';
const list = [
  it('그냥 일', '행동', { due: today }),
  it('회사 주소 정하기', '정하기', { due: today }),
  it('통신판매업 신고', '행동', { due: '2026-11-12', deps: ['회사 주소 정하기'] }),
  it('◆ 런칭', '쪼개기', { due: '2026-11-18', deps: ['회사 주소 정하기', '통신판매업 신고'] }),
  it('막힌 일', '행동', { due: today, status: 'blocked' }),
];
const got = suggestTop(list, today);
assert.deepEqual(got.map((i) => i.title), ['회사 주소 정하기', '그냥 일', '통신판매업 신고']);
assert.deepEqual(got[0].why, ['오늘 마감', '런칭', '1개가 기다림', '정하기']);
assert.ok(got[2].why.includes('선행 남음'));

// 주간 메일: 정할 것 · 고민 · 기다리는 것
const t = { today: '2026-11-08', stats: { week: 0, streak: 0 }, revisit: [] };
const wk = buildWeekly(t, [it('가입 방식', '정하기'), it('서비스 정교화', '고민'), it('알림톡 심사', '기다리기'), { ...it('끝난 고민', '고민'), status: 'done' }], [{ key: area, name: 'Stagelogic' }], {});
assert.match(wk.html, /정할 것 1/); assert.match(wk.html, /고민 중인 것 1/); assert.match(wk.html, /기다리는 것 1/);
assert.ok(!wk.html.includes('끝난 고민'));
console.log('kind ok');
