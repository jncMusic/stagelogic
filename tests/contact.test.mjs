import assert from 'node:assert/strict';
import { createContactHandler } from '../api/_contact-core.js';

const sent = [];
const h = createContactHandler({ ready: () => true, send: async (m) => { sent.push(m); }, to: () => 'me@example.com' });
const call = async (body) => { let code, out; const res = { setHeader() { return res; }, status(c) { code = c; return res; }, json(o) { out = o; return res; } }; await h({ method: 'POST', body }, res); return { code, out }; };

// 학원 개원 · 컨설팅 문의는 그 분야 이름으로 메일 제목이 붙는다
let r = await call({ type: 'academy', name: '김원장', phone: '010-1111-2222', answers: [{ q: '지금 어느 단계인가요?', a: '개원을 준비하고 있어요' }] });
assert.equal(r.code, 200);
assert.match(sent[0].subject, /^\[홈페이지 문의\] 학원 개원 · 컨설팅 - 김원장$/);
assert.ok(sent[0].text.includes('개원을 준비하고 있어요'));
// 모르는 분야는 기타로
r = await call({ type: 'nope', name: 'a', phone: '1', message: 'hi' });
assert.equal(r.code, 200);
assert.match(sent[1].subject, /기타/);
// 필수 칸이 비면 거절
assert.equal((await call({ type: 'academy', name: 'a' })).code, 400);
console.log('ok');
