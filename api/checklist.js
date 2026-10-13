// 사업 점검표 API. 데이터는 Vercel Blob에 JSON 파일로 둔다.
// 필요한 환경 변수: BLOB_READ_WRITE_TOKEN (Blob 저장소를 프로젝트에 연결하면 자동), CHECKLIST_PASSWORD
import { put, list, del } from '@vercel/blob';
import { createHandler } from './_checklist-core.js';

const PREFIX = 'checklist/state';

const blobStore = {
  ready: () => Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  async load() {
    const { blobs } = await list({ prefix: PREFIX });
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    if (!blobs.length) return { items: [], versions: [] };
    const res = await fetch(blobs[0].url, { cache: 'no-store' });
    const data = await res.json();
    return { items: Array.isArray(data.items) ? data.items : [], versions: blobs.map((b) => b.url) };
  },
  async save(items, versions, keep) {
    // 매번 새 이름으로 저장하므로 CDN 캐시 때문에 옛 내용이 보이는 일이 없다
    await put(`${PREFIX}.json`, JSON.stringify({ items, savedAt: new Date().toISOString() }), {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'application/json',
    });
    const stale = versions.slice(keep - 1);
    if (stale.length) await del(stale);
  },
};

export default createHandler(blobStore);
