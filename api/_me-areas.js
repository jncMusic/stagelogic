// J&C · 개인 흐름표의 '영역' 화면. 노션 GTD 구조를 그대로 읽는다.
//   Areas of Responsibility(영역) ← GTD System(프로젝트 · 다음 행동 · 기다림 …) ← Action_DB(할 일)
// 영역마다 끝나지 않은 GTD 항목을 종류별로 보여 주고, 각 항목에 이어진 할 일의 진행을 센다.
export const GTD_IDS = {
  gtd: '496018d3-f627-472c-8ca6-b77d0f2daec7', // GTD System
  areas: 'cb24252d-2bb1-4964-9cc4-b4cdc1ecba8e', // Areas of Responsibility
  lists: 'b7c0b2c8-efa6-4e15-b1d6-052572bd6871', // GTD Lists (Projects, Next actions …)
};
const G = { title: 'Action', done: '완료', due: 'Due date', list: 'GTD', area: 'Related Area', priority: 'Priority' };
const HIDE_LISTS = ['Reference']; // 자료는 할 일이 아니라서 현황판에서 뺀다
const LIST_ORDER = ['Projects', 'Project', 'Next actions', 'Next action', 'Waiting for', 'Reminders', 'Reminder', 'Someday/Maybe', 'Someday'];
const DONE_DAYS = 60;

const plain = (arr) => (arr || []).map((t) => t.plain_text).join('').trim();
const ids = (rel) => (rel?.relation || []).map((r) => r.id);
const listRank = (name) => { const i = LIST_ORDER.findIndex((n) => n.toLowerCase() === String(name).toLowerCase()); return i < 0 ? 99 : i; };

export async function loadAreaBoard(notion, actionDb) {
  const since = new Date(Date.now() - DONE_DAYS * 864e5).toISOString();
  const [areaPages, listPages, gtdPages, actions] = await Promise.all([
    notion.queryAll(GTD_IDS.areas),
    notion.queryAll(GTD_IDS.lists),
    notion.queryAll(GTD_IDS.gtd, { property: G.done, checkbox: { equals: false } }),
    notion.queryAll(actionDb, {
      and: [
        { property: 'GTD System', relation: { is_not_empty: true } },
        { or: [{ property: '완료', checkbox: { equals: false } }, { timestamp: 'last_edited_time', last_edited_time: { on_or_after: since } }] },
      ],
    }),
  ]);
  const titleOf = (p) => plain(Object.values(p.properties || {}).find((v) => v.type === 'title')?.title);
  const lists = listPages.map((p) => ({ id: p.id, name: titleOf(p) })).filter((l) => l.name && !HIDE_LISTS.includes(l.name))
    .sort((a, b) => listRank(a.name) - listRank(b.name) || a.name.localeCompare(b.name));
  const listName = Object.fromEntries(listPages.map((p) => [p.id, titleOf(p)]));
  // 할 일 진행: GTD 항목 id → { total, done }
  const prog = {};
  for (const a of actions) {
    const done = Boolean(a.properties?.['완료']?.checkbox);
    if (a.properties?.['안함']?.checkbox) continue;
    for (const g of ids(a.properties?.['GTD System'])) {
      prog[g] = prog[g] || { total: 0, done: 0 };
      prog[g].total += 1; if (done) prog[g].done += 1;
    }
  }
  const items = gtdPages.map((p) => {
    const pr = p.properties || {};
    const listId = ids(pr[G.list])[0] || '';
    return {
      id: p.id, url: p.url, title: plain(pr[G.title]?.title) || '(제목 없음)',
      due: String(pr[G.due]?.date?.start || '').slice(0, 10), priority: pr[G.priority]?.select?.name || '',
      listId, list: listName[listId] || '', areas: ids(pr[G.area]), actions: prog[p.id] || { total: 0, done: 0 },
    };
  }).filter((i) => !HIDE_LISTS.includes(i.list))
    .sort((a, b) => listRank(a.list) - listRank(b.list) || (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title));
  const areas = areaPages.map((p) => ({ id: p.id, url: p.url, name: titleOf(p) || '(이름 없음)' }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const known = new Set(areas.map((a) => a.id));
  return {
    lists,
    areas: areas.map((a) => ({ ...a, items: items.filter((i) => i.areas.includes(a.id)) })),
    noArea: items.filter((i) => !i.areas.some((x) => known.has(x))),
  };
}

// 현황판에서 하는 일: 완료 체크, 영역에 새 항목 추가
export async function areaOp(notion, body, board) {
  if (body.op === 'gtd-done') {
    if (typeof body.id !== 'string' || !body.id) return 'bad_request';
    await notion.update(body.id, { [G.done]: { checkbox: body.done !== false } });
    return null;
  }
  if (body.op === 'gtd-add') {
    const title = String(body.title || '').trim().slice(0, 120);
    if (!title) return 'title_required';
    const props = { [G.title]: { title: [{ text: { content: title } }] } };
    if (board.areas.some((a) => a.id === body.area)) props[G.area] = { relation: [{ id: body.area }] };
    if (board.lists.some((l) => l.id === body.list)) props[G.list] = { relation: [{ id: body.list }] };
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(body.due || ''))) props[G.due] = { date: { start: body.due } };
    await notion.create(GTD_IDS.gtd, props);
    return null;
  }
  return 'unknown_op';
}
