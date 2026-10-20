// 업무 흐름(/work/)과 노션 Action_DB의 단계를 서로 맞춘다. 노션 페이지와 이어 둔 업무(item.notion)만.
//  - /work/ 에서 단계를 바꾸면 → 노션의 시작 · 보류 · 완료 체크도 바꾼다
//  - 노션(또는 /me/)에서 바꾼 단계는 → /work/ 를 열 때 가져온다
// 노션 쪽은 '분야'가 NOTION_WORK_AREA(기본 Stagelogic)인 페이지만 읽는다.
export const ACTION_DB = '18f46c00-a29b-80c2-8feb-dd7a67f76b84';
const P = { area: '분야', doing: '시작', blocked: '보류', done: '완료', skip: '안함' };

export const statusOf = (pr) => (pr[P.done]?.checkbox ? 'done' : pr[P.blocked]?.checkbox ? 'blocked' : pr[P.doing]?.checkbox ? 'doing' : 'todo');
export const statusProps = (s) => ({ [P.doing]: { checkbox: s === 'doing' }, [P.blocked]: { checkbox: s === 'blocked' }, [P.done]: { checkbox: s === 'done' } });

export function workSync({ notion, dbId = ACTION_DB, area = 'Stagelogic' }) {
  return {
    // { 페이지 id: { status, edited } } — '안함'으로 뺀 것과 지운 것은 없음
    async pull() {
      const pages = await notion.queryAll(dbId, { property: P.area, select: { equals: area } });
      return Object.fromEntries(pages.filter((p) => !p.properties?.[P.skip]?.checkbox)
        .map((p) => [p.id, { status: statusOf(p.properties || {}), edited: p.last_edited_time }]));
    },
    // 바꾼 뒤 노션의 마지막 수정 시각을 돌려준다
    async push(pageId, status) {
      const page = await notion.update(pageId, statusProps(status));
      return page.last_edited_time || '';
    },
  };
}
