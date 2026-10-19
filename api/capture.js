// 빠른 기록 (/api/capture/). 동작은 _capture-core.js 에 있다.
import { notionClient } from './_notion.js';
import { createCaptureHandler } from './_capture-core.js';

export default createCaptureHandler({
  notion: notionClient(process.env.NOTION_TOKEN || ''),
  dbId: process.env.NOTION_ME_DB || '18f46c00-a29b-80c2-8feb-dd7a67f76b84',
});
