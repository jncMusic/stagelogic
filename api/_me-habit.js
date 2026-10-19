// J&C · 개인 흐름표의 '기록 · 정리 · 점검' 습관 도구.
//  - 수집함: 노션 Action_DB에서 '분야'가 비어 있는 할 일 (INBOX_SINCE 이후에 만든 것만 — 예전 기록은 건드리지 않음)
//  - 오늘의 3가지 · 저녁 점검 기록: Blob(meta)의 _days[날짜] = { top: [id…], check: { id: { r, why, at } } }
//  - 다시 정할 일: 마감이 3일 넘게 지난 할 일
//  - 기록 수 · 연속 기록일: Action_DB에 새로 만든 페이지 수 (한국 날짜 기준)
export const INBOX_SINCE_DEFAULT = '2026-10-18';
const REVISIT_DAYS = 3;

export const kst = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
export const addDays = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const kstStartIso = (d) => new Date(`${d}T00:00:00+09:00`).toISOString();
const gap = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const pick = (i) => ({ id: i.id, title: i.title, area: i.area, due: i.due, status: i.status, url: i.url });

// 오늘의 3가지 추천: 마감 지남 → 오늘 마감 → 진행 중 → 마감 가까운 순 (막힌 일 제외)
export function suggestTop(items, today) {
  const score = (i) => (i.due && i.due < today ? 0 : i.due === today ? 1 : i.status === 'doing' ? 2 : i.due ? 3 : 4);
  return items.filter((i) => i.status !== 'done' && i.status !== 'blocked')
    .sort((a, b) => score(a) - score(b) || (a.due || '9').localeCompare(b.due || '9') || a.title.localeCompare(b.title))
    .slice(0, 8);
}

export async function loadToday({ notion, dbId, P, items, meta, env = process.env, now = Date.now() }) {
  const today = kst(now);
  const since = env.INBOX_SINCE || INBOX_SINCE_DEFAULT;
  const [inboxPages, created] = await Promise.all([
    notion.queryAll(dbId, {
      and: [
        { property: P.area, select: { is_empty: true } },
        { property: P.done, checkbox: { equals: false } },
        { property: P.skip, checkbox: { equals: false } },
        { timestamp: 'created_time', created_time: { on_or_after: kstStartIso(since) } },
      ],
    }),
    notion.queryAll(dbId, { timestamp: 'created_time', created_time: { on_or_after: new Date(now - 60 * 864e5).toISOString() } }),
  ]);
  const titleOf = (p) => (p.properties?.[P.title]?.title || []).map((t) => t.plain_text).join('').trim() || '(제목 없음)';
  const inbox = inboxPages.map((p) => ({ id: p.id, title: titleOf(p), url: p.url, created: p.created_time }))
    .sort((a, b) => String(a.created).localeCompare(String(b.created)));
  const perDay = {};
  for (const p of created) { const d = kst(Date.parse(p.created_time)); perDay[d] = (perDay[d] || 0) + 1; }
  let streak = 0;
  for (let d = perDay[today] ? today : addDays(today, -1); perDay[d]; d = addDays(d, -1)) streak += 1;
  let week = 0; for (let k = 0; k < 7; k += 1) week += perDay[addDays(today, -k)] || 0;

  const days = meta._days || {};
  const day = days[today] || { top: [], check: {} };
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const top = (day.top || []).map((id) => byId[id]).filter(Boolean).map((i) => ({ ...pick(i), check: day.check?.[i.id] || null }));
  const yd = days[addDays(today, -1)];
  const yesterdayMissed = Boolean(yd && (yd.top || []).some((id) => byId[id] && byId[id].status !== 'done' && !yd.check?.[id]));
  const revisit = items.filter((i) => i.status !== 'done' && i.due && gap(i.due, today) > REVISIT_DAYS)
    .sort((a, b) => a.due.localeCompare(b.due)).map((i) => ({ ...pick(i), late: gap(i.due, today) }));
  const suggest = top.length ? [] : suggestTop(items, today).map(pick);
  return { today, inbox, top, suggest, revisit, stats: { today: perDay[today] || 0, streak, week }, yesterdayMissed, perDay };
}

// 주간 리뷰에 쓰는 지난 7일 점검 기록
export function weekChecks(meta, today) {
  const days = meta._days || {};
  const out = { planned: 0, checked: 0, postponed: [] };
  for (let k = 0; k < 7; k += 1) {
    const d = addDays(today, -k); const day = days[d]; if (!day || !(day.top || []).length) continue;
    out.planned += 1;
    const checks = Object.entries(day.check || {});
    if (checks.length) out.checked += 1;
    for (const [id, c] of checks) if (c.r !== 'done') out.postponed.push({ id, day: d, r: c.r, why: c.why || '' });
  }
  return out;
}
