// 업무 흐름(/work/)과 노션 Action_DB를 양쪽으로 맞춘다. 노션 쪽은 '분야'가 NOTION_WORK_AREA(기본 Stagelogic)인 페이지.
//   맞추는 칸: 제목 · 단계(시작 · 보류 · 완료 체크) · 시작일/마감일(날짜 · 데드라인) · 분야(/work/ 분야 이름 = 노션 '태그')
//   - /work/ 에서 고치면 바로 노션에 쓴다. 새 업무는 노션 페이지를 만들고, 지우면 노션 페이지도 휴지통으로
//   - 노션 · /me/ 에서 고친 것은 /work/ 를 열 때(1분마다) 가져온다. 노션에서 새로 만든 Stagelogic 페이지는 /work/ 에 업무로 생긴다
//   - 노션에서 지우거나 '안함'을 체크하면 /work/ 에서도 빠지고, 다른 분야로 옮기면 잇기만 끊는다
//   설명 · 메모 · 담당 · 선행 업무는 /work/ 와 /me/ 가 따로 갖는다.
// 업무의 item.notion = { id: 페이지 id, seen: 마지막으로 맞춘 노션 수정 시각, dl: 데드라인 칸을 쓰는지, dirty: 노션 쓰기 실패 }
import { fromPage, toProps, P } from './_me-core.js';
import { cleanItem, logged, STATUS_NAME, FIELD_NAME } from './_checklist-core.js';

export const ACTION_DB = '18f46c00-a29b-80c2-8feb-dd7a67f76b84';
const FIELDS = ['title', 'status', 'start', 'due', 'area'];
const MAX_CHECK = 10; // 한 번에 확인하는 '사라진 페이지' 수

const areaName = (areas, key) => (areas.find((a) => a.key === key) || {}).name || '';
const areaKey = (areas, tag) => (areas.find((a) => a.name === tag) || {}).key;

// 노션 페이지 → /work/ 칸 (분야는 태그가 /work/ 분야 이름과 같을 때만)
function fromNotion(page, areas) {
  const f = fromPage(page);
  const out = { title: f.title, status: f.status, start: f.start, due: f.due };
  const k = areaKey(areas, f.tag);
  if (k) out.area = k;
  return { fields: out, dl: f._hasDeadline };
}

// /work/ 업무의 바뀐 칸 → 노션 속성
function toNotion(item, fields, areas) {
  const f = {};
  for (const k of fields) { if (k === 'area') f.tag = areaName(areas, item.area); else f[k] = item[k]; }
  return toProps(f, [], { start: item.start, due: item.due, _hasDeadline: Boolean(item.notion?.dl) });
}

function changeLine(cur, next, keys) {
  const lines = [];
  if (keys.includes('status')) lines.push(`상태: ${STATUS_NAME[cur.status]} → ${STATUS_NAME[next.status]}`);
  const rest = keys.filter((k) => k !== 'status');
  if (rest.length) lines.push(`수정: ${rest.map((k) => FIELD_NAME[k]).join(', ')}`);
  return lines.join(' · ');
}

export function workSync({ notion, dbId = ACTION_DB, area = 'Stagelogic' }) {
  // 노션 쓰기. 실패하면 dirty 를 남겨 다음에 다시 쓴다
  async function write(item, fields, areas) {
    try {
      const page = await notion.update(item.notion.id, toNotion(item, fields, areas));
      return { ...item, notion: { ...item.notion, seen: page.last_edited_time || '', dirty: false } };
    } catch (err) {
      console.error('checklist notion write', err);
      return { ...item, notion: { ...item.notion, dirty: true } };
    }
  }

  return {
    // GET 때: 노션에서 바뀐 것 · 새로 생긴 것 · 사라진 것을 /work/ 에 반영한다. 바뀐 것이 없으면 null
    async reconcile(items, areas, now) {
      // 이어 둔 업무가 하나도 없으면 아직 연결 전 — 노션 페이지를 통째로 들여오지 않는다
      if (!items.some((i) => i.notion)) return null;
      let pages;
      try { pages = await notion.queryAll(dbId, { property: P.area, select: { equals: area } }); } catch (err) { console.error('checklist notion pull', err); return null; }
      const byId = new Map(pages.map((p) => [p.id, p]));
      const skip = (p) => Boolean(p.properties?.[P.skip]?.checkbox);
      let changed = false;
      const gone = new Set();
      const unlink = new Set();
      // 이어 둔 페이지가 목록에 없으면: 지웠는지, 다른 분야로 옮겼는지 확인
      const missing = items.filter((i) => i.notion && !byId.has(i.notion.id)).slice(0, MAX_CHECK);
      await Promise.all(missing.map(async (i) => {
        try {
          const p = await notion.page(i.notion.id);
          if (p.archived || p.in_trash || skip(p)) gone.add(i.id); else unlink.add(i.id);
        } catch (err) {
          if (err.status === 404) gone.add(i.id); else console.error('checklist notion page', err);
        }
      }));
      let next = [];
      for (const i of items) {
        if (!i.notion) { next.push(i); continue; }
        if (gone.has(i.id)) { changed = true; continue; }
        if (unlink.has(i.id)) { changed = true; const { notion: _n, ...rest } = i; next.push(rest); continue; }
        const p = byId.get(i.notion.id);
        if (!p) { next.push(i); continue; }
        if (skip(p)) { changed = true; gone.add(i.id); continue; }
        if (p.last_edited_time === i.notion.seen) {
          // 노션은 그대로인데 /work/ 쪽 쓰기가 실패해 있었다면 다시 쓴다
          if (i.notion.dirty) { changed = true; next.push(await write(i, FIELDS, areas)); } else next.push(i);
          continue;
        }
        changed = true;
        const n = fromNotion(p, areas);
        const keys = FIELDS.filter((k) => k in n.fields && n.fields[k] !== i[k]);
        const base = { ...i, notion: { id: i.notion.id, seen: p.last_edited_time, dl: n.dl, dirty: false } };
        if (!keys.length) { next.push(base); continue; }
        const upd = { ...base, ...Object.fromEntries(keys.map((k) => [k, n.fields[k]])), updatedAt: now };
        next.push(logged(upd, '노션', now, changeLine(i, upd, keys)));
      }
      // 노션에서 새로 만든 페이지 → /work/ 업무
      const linked = new Set(items.filter((i) => i.notion).map((i) => i.notion.id));
      const keys = areas.map((a) => a.key);
      for (const p of pages) {
        if (linked.has(p.id) || skip(p)) continue;
        const n = fromNotion(p, areas);
        const ar = n.fields.area || keys[0];
        const order = Math.max(0, ...next.filter((i) => i.area === ar).map((i) => i.order || 0)) + 1;
        const item = cleanItem({ ...n.fields, area: ar, order, id: '', owner: '대표', log: [], updatedAt: now, notion: { id: p.id, seen: p.last_edited_time, dl: n.dl } }, keys);
        next.push(logged(item, '노션', now, '노션에서 추가'));
        changed = true;
      }
      // 사라진 업무를 선행으로 걸어 둔 것 정리
      if (gone.size) next = next.map((i) => (i.deps.some((d) => gone.has(d)) ? { ...i, deps: i.deps.filter((d) => !gone.has(d)) } : i));
      return changed ? next : null;
    },

    // POST 뒤: /work/ 에서 바뀐 것을 노션에 쓴다
    async afterWrite(before, after, areas, nextAreas, op) {
      const was = new Map(before.map((i) => [i.id, i]));
      // 분야 이름을 바꾸면 그 분야 업무의 노션 태그도 바꾼다
      const renamed = new Set(op === 'areas' ? nextAreas.filter((a) => areaName(areas, a.key) && areaName(areas, a.key) !== a.name).map((a) => a.key) : []);
      return Promise.all(after.map(async (i) => {
        const cur = was.get(i.id);
        if (!cur) {
          if (op !== 'add' || i.notion) return i;
          // /work/ 에서 새로 만든 업무 → 노션 페이지
          try {
            const page = await notion.create(dbId, { ...toNotion(i, FIELDS, nextAreas), [P.area]: { select: { name: area } } });
            return { ...i, notion: { id: page.id, seen: page.last_edited_time || '', dl: false } };
          } catch (err) { console.error('checklist notion create', err); return i; }
        }
        if (!i.notion) return i;
        const keys = FIELDS.filter((k) => JSON.stringify(i[k]) !== JSON.stringify(cur[k]));
        if (renamed.has(i.area) && !keys.includes('area')) keys.push('area');
        if (i.notion.dirty) return write(i, FIELDS, nextAreas);
        return keys.length ? write(i, keys, nextAreas) : i;
      }));
    },

    // /work/ 에서 지우면 노션 페이지도 휴지통으로 (노션에서 30일 안에 되살릴 수 있음)
    remove: (pageId) => notion.archive(pageId).catch((err) => { if (err.status !== 404) throw err; }),
  };
}
