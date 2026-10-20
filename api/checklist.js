// 업무 흐름(사업 점검표) API. 저장소는 _store.js, 동작은 _checklist-core.js 에 있다.
// NOTION_TOKEN 이 있으면 노션 Action_DB와 이어 둔 업무의 단계를 서로 맞춘다 (_checklist-notion.js).
import { blobStore } from './_store.js';
import { createHandler } from './_checklist-core.js';
import { notionClient } from './_notion.js';
import { workSync, ACTION_DB } from './_checklist-notion.js';

const sync = process.env.NOTION_TOKEN
  ? workSync({ notion: notionClient(process.env.NOTION_TOKEN), dbId: process.env.NOTION_ME_DB || ACTION_DB, area: process.env.NOTION_WORK_AREA || 'Stagelogic' })
  : null;

export default createHandler(blobStore, process.env, sync);
