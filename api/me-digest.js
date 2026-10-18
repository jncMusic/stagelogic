// J&C · 개인 흐름표 메일 (/api/me-digest/?kind=morning|evening|weekly). 동작은 _me-digest.js 에 있다.
import { makeBlobStore } from './_store.js';
import { notionClient } from './_notion.js';
import { createMeService } from './_me-core.js';
import { mailReady, sendMail } from './_mail.js';
import { createMeDigestHandler } from './_me-digest.js';

const service = createMeService({
  notion: notionClient(process.env.NOTION_TOKEN || ''),
  store: makeBlobStore('me/meta'),
  dbId: process.env.NOTION_ME_DB || '18f46c00-a29b-80c2-8feb-dd7a67f76b84',
});

export default createMeDigestHandler({ service, ready: () => mailReady(), send: (m) => sendMail(m) });
