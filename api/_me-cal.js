// J&C · 개인 흐름표의 캘린더 구독 주소 (/api/me-cal/?k=키). 구글 캘린더 · 아이폰 캘린더에 'URL로 추가'해서 본다(보기 전용).
//   날짜가 있는 업무만, 하루 종일 일정으로. 시작일~마감일이면 그 기간, 아니면 마감일 하루. 끝낸 일은 ✓ 를 붙인다.
//   키는 ME_PASSWORD 에서 만든 값이라 따로 설정할 것이 없고, 비밀번호를 바꾸면 주소도 바뀐다.
//   주소는 /me/ 메뉴 '캘린더 구독 주소'에서 받는다 (비밀번호로 연 사람만).
import { createHmac } from 'node:crypto';
import { addDays } from './_me-habit.js';
import { same } from './_checklist-core.js';

export const calKey = (secret) => createHmac('sha256', String(secret)).update('me-calendar').digest('hex').slice(0, 32);
export const calUrl = (secret, origin = 'https://www.stagelogic.kr') => `${origin}/api/me-cal/?k=${calKey(secret)}`;

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const ymd = (d) => d.replace(/-/g, '');
// 한 줄은 75바이트까지 (넘으면 다음 줄을 공백으로 시작해 잇는다)
function fold(line) {
  const out = []; let cur = ''; let n = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (n + b > 74) { out.push(cur); cur = ' '; n = 1; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

export function buildIcs(items, areas, now = new Date()) {
  const name = (k) => (areas.find((a) => a.key === k) || {}).name || '';
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//stagelogic.kr//me//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:개인 일정', 'X-WR-TIMEZONE:Asia/Seoul', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H'];
  for (const i of items) {
    const end = i.due || i.start;
    if (!end) continue;
    const start = i.start && i.start <= end ? i.start : end;
    const area = name(i.area);
    lines.push('BEGIN:VEVENT', `UID:${i.id}@stagelogic.kr`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(addDays(end, 1))}`,
      `SUMMARY:${esc(`${i.status === 'done' ? '✓ ' : ''}${area ? `[${area}] ` : ''}${i.title}`)}`,
      ...(i.url ? [`URL:${i.url}`, `DESCRIPTION:${esc(`노션에서 열기: ${i.url}`)}`] : []),
      'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function createMeCalHandler({ service, env = process.env }) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (!env.ME_PASSWORD || !env.NOTION_TOKEN) return res.status(503).send('not configured');
    const k = String(req.query?.k ?? new URL(req.url || '/', 'http://x').searchParams.get('k') ?? '');
    if (!same(k, calKey(env.ME_PASSWORD))) return res.status(401).send('unauthorized');
    try {
      const { items, areas } = await service.loadAll(false);
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      return res.status(200).send(buildIcs(items, areas));
    } catch (err) {
      console.error('me cal', err);
      return res.status(500).send('server error');
    }
  };
}
