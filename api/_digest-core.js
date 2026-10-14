// 아침 업무 요약 메일. 마감 지남 · 오늘 · 3일 안 · 막힘 · 진행 중을 모아 보낸다.
import { escapeHtml as e } from './_mail.js';
import { DEFAULT_AREAS } from './_checklist-core.js';

const NAME = { todo: '할 일', doing: '진행 중', blocked: '막힘', done: '완료' };
const kstToday = (now) => new Date(now + 9 * 3600e3).toISOString().slice(0, 10);
const diff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

export function buildDigest(items, areas, today) {
  areas = Array.isArray(areas) && areas.length ? areas : DEFAULT_AREAS; // 예전 저장 파일에는 분야 목록이 없다
  const area = (k) => (areas.find((a) => a.key === k) || { name: k }).name;
  const open = items.filter((i) => i.status !== 'done');
  const by = (f) => open.filter(f).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const groups = [
    ['마감 지남', '#b02a2a', by((i) => i.due && diff(today, i.due) < 0), (i) => `${-diff(today, i.due)}일 지남`],
    ['오늘 마감', '#8a5a00', by((i) => i.due && diff(today, i.due) === 0), () => '오늘'],
    ['3일 안에 마감', '#8a5a00', by((i) => i.due && diff(today, i.due) >= 1 && diff(today, i.due) <= 3), (i) => `D-${diff(today, i.due)}`],
    ['막힘', '#b02a2a', by((i) => i.status === 'blocked'), () => '막힘'],
    ['진행 중', '#2a78d6', by((i) => i.status === 'doing'), (i) => (i.due ? `~${i.due.slice(5).replace('-', '.')}` : '')],
  ];
  const done = items.filter((i) => i.status === 'done').length;
  const pct = items.length ? Math.round(items.reduce((s, i) => s + (i.status === 'done' ? 1 : i.status === 'doing' ? 0.5 : 0), 0) / items.length * 100) : 0;
  const urgent = groups[0][2].length + groups[1][2].length;
  const subject = `[업무 흐름] ${today.slice(5).replace('-', '/')} ${urgent ? `급한 일 ${urgent}건 · ` : ''}진척 ${pct}%`;
  const section = ([title, color, list, tag]) => (list.length ? `<h3 style="margin:20px 0 8px;font-size:15px;color:${color}">${title} ${list.length}</h3>
    <table style="border-collapse:collapse;width:100%">${list.map((i) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee"><b>${e(i.title)}</b><br><span style="color:#777;font-size:12px">${e(area(i.area))} · ${e(i.owner)} · ${NAME[i.status]}${i.note ? ` · ${e(i.note.slice(0, 80))}` : ''}</span></td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;color:${color};font-weight:700">${e(tag(i))}</td></tr>`).join('')}</table>` : '');
  const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.55;color:#111;max-width:560px">
    <p style="margin:0;color:#777">${today} 아침 요약</p>
    <h2 style="margin:4px 0 4px;font-size:20px">진척 ${pct}% · 완료 ${done} / ${items.length}</h2>
    ${groups.map(section).join('') || '<p>급한 일이 없습니다.</p>'}
    <p style="margin-top:24px"><a href="https://www.stagelogic.kr/work/" style="background:#111;color:#fff;padding:9px 16px;border-radius:8px;text-decoration:none;font-weight:700">업무 흐름 열기</a></p></div>`;
  const text = [`${today} 진척 ${pct}% · 완료 ${done}/${items.length}`, ...groups.filter((g) => g[2].length).map(([t, , l, tag]) => `\n[${t} ${l.length}]\n${l.map((i) => `- ${i.title} (${i.owner}) ${tag(i)}`).join('\n')}`), '\nhttps://www.stagelogic.kr/work/'].join('\n');
  return { subject, html, text, counts: Object.fromEntries(groups.map(([t, , l]) => [t, l.length])) };
}

// Vercel Cron 이 부른다. CRON_SECRET 이 있으면 Authorization: Bearer 로 확인한다.
export function createDigestHandler({ store, ready, send, to, env = process.env, now = () => Date.now() }) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (env.CRON_SECRET && req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
    if (!ready() || !store.ready()) return res.status(503).json({ error: 'not_configured' });
    try {
      const { items, areas } = await store.load();
      const d = buildDigest(Array.isArray(items) ? items : [], areas, kstToday(now()));
      await send({ to: to(), subject: d.subject, html: d.html, text: d.text });
      return res.status(200).json({ ok: true, counts: d.counts });
    } catch (err) {
      console.error('digest', err);
      return res.status(500).json({ error: 'server_error' });
    }
  };
}
