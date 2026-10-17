// J&C · 개인 흐름표 API (/api/me/). 동작은 _me-core.js, 노션 호출은 _notion.js 에 있다.
// 필요한 환경 변수: NOTION_TOKEN, ME_PASSWORD (선택: NOTION_ME_DB — 기본은 Action_DB)
import { makeBlobStore } from './_store.js';
import { notionClient } from './_notion.js';
import { createMeHandler } from './_me-core.js';

const ACTION_DB = '18f46c00-a29b-80c2-8feb-dd7a67f76b84';

export default createMeHandler({
  notion: notionClient(process.env.NOTION_TOKEN || ''),
  store: makeBlobStore('me/meta'),
  dbId: process.env.NOTION_ME_DB || ACTION_DB,
});
