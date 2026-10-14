// 업무 흐름(사업 점검표) API. 저장소는 _store.js, 동작은 _checklist-core.js 에 있다.
import { blobStore } from './_store.js';
import { createHandler } from './_checklist-core.js';

export default createHandler(blobStore);
