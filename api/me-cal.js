// J&C · 개인 흐름표 캘린더 구독 주소 (/api/me-cal/?k=키). 동작은 _me-cal.js 에 있다.
import { makeBlobStore } from './_store.js';
import { notionClient } from './_notion.js';
import { createMeService } from './_me-core.js';
import { createMeCalHandler } from './_me-cal.js';
import { ACTION_DB } from './_checklist-notion.js';

const service = createMeService({
  notion: notionClient(process.env.NOTION_TOKEN || ''),
  store: makeBlobStore('me/meta'),
  dbId: process.env.NOTION_ME_DB || ACTION_DB,
});

export default createMeCalHandler({ service });
