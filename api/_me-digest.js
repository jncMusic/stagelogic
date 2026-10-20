// J&C · 개인 흐름표의 아침 · 저녁 · 주간 메일 (나에게만). vercel.json crons 가 부른다.
//   아침 9시: 오늘의 3가지 정하기 · 마감 · 다시 정할 일 · 수집함 · 기록 연속일
//   저녁 9시: 점검 — 남은 3가지, 수집함 정리, 오늘 기록 수
//   일요일 저녁: 주간 리뷰 — 기록 · 완료 · 분야별 · 점검한 날 · 미룬 이유
// 받는 주소: ME_MAIL_TO (필수)
import { escapeHtml as e } from './_mail.js';
import { kst, addDays, weekChecks } from './_me-habit.js';

const LINK = 'https://www.stagelogic.kr/me/';
const md = (d) => (d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : '');
const wrap = (head, body) => `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111;max-width:560px">
  <p style="margin:0;color:#777">${head}</p>${body}
  <p style="margin-top:24px"><a href="${LINK}" style="background:#111;color:#fff;padding:9px 16px;border-radius:8px;text-decoration:none;font-weight:700">흐름표 열기</a></p></div>`;
const sec = (title, rows, color = '#111') => (rows.length ? `<h3 style="margin:20px 0 6px;font-size:15px;color:${color}">${title} ${rows.length}</h3><ul style="margin:0;padding-left:18px">${rows.map((r) => `<li style="margin:3px 0">${r}</li>`).join('')}</ul>` : '');
const areaName = (areas, k) => (areas.find((a) => a.key === k) || {}).name || '';
const row = (areas, i, tail = '') => `<b>${e(i.title)}</b> <span style="color:#777;font-size:12px">${e(areaName(areas, i.area))}${i.due ? ` · ${md(i.due)}` : ''}${tail}</span>`;
const stat = (t) => `<p style="margin:14px 0 0;padding:10px 12px;background:#f4f3ef;border-radius:8px">오늘 기록 <b>${t.stats.today}</b> · 이번 주 <b>${t.stats.week}</b> · 연속 <b>${t.stats.streak}일</b></p>`;

export function buildMorning(t, items, areas) {
  const today = t.today;
  const open = items.filter((i) => i.status !== 'done');
  const late = open.filter((i) => i.due && i.due < today && !t.revisit.some((r) => r.id === i.id));
  const due = open.filter((i) => i.due === today);
  const body = `<h2 style="margin:4px 0;font-size:20px">${t.top.length ? '오늘의 3가지' : '오늘의 3가지를 정하세요'}</h2>
    ${t.yesterdayMissed ? `<p style="margin:6px 0;color:#b02a2a;font-weight:700">어제 점검을 하지 않았습니다. 흐름표 '오늘' 칸에서 먼저 정리해 주세요.</p>${sec('어제 남은 일', (t.yesterday || []).map((i) => row(areas, i)), '#b02a2a')}` : ''}
    ${t.top.length ? `<ol style="margin:6px 0;padding-left:20px">${t.top.map((i) => `<li>${row(areas, i)}</li>`).join('')}</ol>`
      : `<p style="margin:6px 0;color:#555">추천 (흐름표에서 골라 확정하세요)</p><ol style="margin:0;padding-left:20px">${t.suggest.slice(0, 3).map((i) => `<li>${row(areas, i)}</li>`).join('')}</ol>`}
    ${sec('다시 정할 일 (3일 넘게 밀림)', t.revisit.map((i) => row(areas, i, ` · <b style="color:#b02a2a">${i.late}일 지남</b>`)), '#b02a2a')}
    ${sec('마감 지남', late.map((i) => row(areas, i)), '#b02a2a')}
    ${sec('오늘 마감', due.map((i) => row(areas, i)), '#8a5a00')}
    ${t.inbox.length ? `<p style="margin:16px 0 0">수집함에 정리 안 된 기록 <b>${t.inbox.length}개</b> — 저녁 점검 때 정리하세요.</p>` : ''}
    ${stat(t)}`;
  const subject = `[오늘] ${md(today)} ${t.top.length ? '오늘의 3가지' : '오늘의 3가지 정하기'}${t.revisit.length ? ` · 다시 정할 일 ${t.revisit.length}` : ''}${t.yesterdayMissed ? ' · 어제 점검 안 함' : ''}`;
  return { subject, html: wrap(`${today} 아침`, body) };
}

export function buildEvening(t, items, areas) {
  const left = t.top.filter((i) => i.status !== 'done' && !i.check);
  const body = `<h2 style="margin:4px 0;font-size:20px">점검할 시간입니다</h2>
    <p style="margin:6px 0;color:#555">① 수집함 정리 → ② 오늘의 3가지 점검. 남은 일은 완료 · 내일로 · 보류 중 하나를 고르고, 미룰 땐 이유를 한 줄 적습니다.</p>
    ${t.inbox.length ? sec('① 수집함 (분야를 붙여 주세요)', t.inbox.map((i) => e(i.title))) : '<p style="margin:12px 0 0">① 수집함이 비어 있습니다.</p>'}
    ${t.top.length ? (left.length ? sec('② 오늘의 3가지 중 남은 일', left.map((i) => row(areas, i)), '#8a5a00') : '<p style="margin:12px 0 0">② 오늘의 3가지를 모두 정리했습니다. 👏</p>')
      : '<p style="margin:12px 0 0;color:#b02a2a">② 오늘의 3가지를 정하지 않았습니다. 내일 아침엔 먼저 정해 보세요.</p>'}
    ${stat(t)}`;
  const subject = `[점검] ${md(t.today)} ${left.length ? `남은 일 ${left.length}` : t.top.length ? '3가지 정리 완료' : '오늘의 3가지 없음'}${t.inbox.length ? ` · 수집함 ${t.inbox.length}` : ''}`;
  return { subject, html: wrap(`${t.today} 저녁`, body) };
}

export function buildWeekly(t, items, areas, meta) {
  const from = addDays(t.today, -6);
  const doneWeek = items.filter((i) => i.status === 'done' && i.updatedAt && kst(Date.parse(i.updatedAt)) >= from);
  const byArea = areas.map((a) => [a.name, doneWeek.filter((i) => i.area === a.key).length]).filter(([, n]) => n);
  const w = weekChecks(meta, t.today);
  const title = (id) => (items.find((i) => i.id === id) || {}).title || '(지금 목록에 없음)';
  const times = {}; w.postponed.forEach((p) => { times[p.id] = (times[p.id] || 0) + 1; });
  const most = Object.entries(times).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const body = `<h2 style="margin:4px 0;font-size:20px">이번 주 돌아보기</h2>
    <table style="border-collapse:collapse;margin:8px 0">${[['기록', `${t.stats.week}개`], ['완료', `${doneWeek.length}개`], ['오늘의 3가지 정한 날', `${w.planned} / 7일`], ['점검한 날', `${w.checked} / 7일`], ['연속 기록', `${t.stats.streak}일`]]
      .map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;color:#666">${k}</td><td style="font-weight:700">${v}</td></tr>`).join('')}</table>
    ${byArea.length ? sec('분야별 완료', byArea.map(([n, c]) => `${e(n)} <b>${c}</b>`)) : ''}
    ${sec('자주 미룬 일', most.map(([id, c]) => `${e(title(id))} <b style="color:#b02a2a">${c}번</b>`), '#b02a2a')}
    ${sec('미룬 이유', w.postponed.slice(0, 12).map((p) => `${md(p.day)} ${e(title(p.id))} — ${p.r === 'tomorrow' ? '내일로' : '보류'}: ${e(p.why)}`))}
    ${sec('다시 정할 일', t.revisit.map((i) => row(areas, i, ` · ${i.late}일 지남`)), '#b02a2a')}
    <p style="margin:16px 0 0;color:#555">다음 주에 바꿔 볼 한 가지를 노션에 적어 두세요.</p>`;
  return { subject: `[주간 리뷰] ${md(from)}~${md(t.today)} 기록 ${t.stats.week} · 완료 ${doneWeek.length}`, html: wrap(`${from} ~ ${t.today}`, body) };
}

export function createMeDigestHandler({ service, send, ready, env = process.env, now = () => Date.now() }) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (env.CRON_SECRET && req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
    if (!ready() || !env.ME_MAIL_TO || !env.NOTION_TOKEN) return res.status(503).json({ error: 'not_configured', missing: [!env.ME_MAIL_TO && 'ME_MAIL_TO', !env.NOTION_TOKEN && 'NOTION_TOKEN', !ready() && 'mail'].filter(Boolean) });
    const kind = String(req.query?.kind || new URL(req.url || '/', 'http://x').searchParams.get('kind') || 'morning');
    try {
      const loaded = await service.loadAll(kind === 'weekly');
      const t = await service.today(loaded, now());
      const m = kind === 'evening' ? buildEvening(t, loaded.items, loaded.areas)
        : kind === 'weekly' ? buildWeekly(t, loaded.items, loaded.areas, loaded.meta)
          : buildMorning(t, loaded.items, loaded.areas);
      await send({ to: env.ME_MAIL_TO, subject: m.subject, html: m.html });
      return res.status(200).json({ ok: true, kind, subject: m.subject });
    } catch (err) {
      console.error('me digest', err);
      return res.status(500).json({ error: 'server_error' });
    }
  };
}
