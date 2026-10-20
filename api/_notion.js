// 노션 API를 직접 부르는 작은 도우미. J&C · 개인 흐름표(/api/me/)가 쓴다.
// 필요한 환경 변수: NOTION_TOKEN (노션 '내부 통합' 키). 통합에 Action_DB를 공유해 두어야 읽고 쓸 수 있다.
const BASE = 'https://api.notion.com/v1';
const VERSION = '2022-06-28';

export function notionClient(token, fetchImpl = fetch) {
  async function call(method, path, body) {
    const res = await fetchImpl(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': VERSION, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(`notion ${res.status} ${data.code || ''} ${data.message || ''}`.trim());
      err.status = res.status;
      throw err;
    }
    return data;
  }
  return {
    database: (id) => call('GET', `/databases/${id}`),
    // 결과가 100개를 넘으면 다음 쪽까지 이어서 모은다
    async queryAll(id, filter) {
      const out = [];
      let cursor;
      do {
        const page = await call('POST', `/databases/${id}/query`, { filter, page_size: 100, start_cursor: cursor });
        out.push(...page.results);
        cursor = page.has_more ? page.next_cursor : undefined;
      } while (cursor && out.length < 1000);
      return out;
    },
    page: (pageId) => call('GET', `/pages/${pageId}`),
    create: (databaseId, properties) => call('POST', '/pages', { parent: { database_id: databaseId }, properties }),
    update: (pageId, properties) => call('PATCH', `/pages/${pageId}`, { properties }),
    archive: (pageId) => call('PATCH', `/pages/${pageId}`, { archived: true }),
  };
}
