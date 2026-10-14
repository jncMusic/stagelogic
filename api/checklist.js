// 사업 점검표 API. 데이터는 Vercel Blob에 JSON 파일로 둔다.
// 필요한 환경 변수: CHECKLIST_PASSWORD, 그리고 Blob 저장소 연결로 자동 생기는 값
// (새 저장소는 BLOB_STORE_ID + OIDC, 예전 저장소는 BLOB_READ_WRITE_TOKEN)
import { put, list, del, get } from '@vercel/blob';
import { createHandler } from './_checklist-core.js';

const PREFIX = 'checklist/state';

// 저장소를 만들 때 고른 공개 범위(private/public)에 맞춰야 저장된다.
// 처음엔 private으로 시도하고, 거절되면 public 저장소로 보고 기억해 둔다.
let access = 'private';
const accessOf = (url) => (new URL(url).hostname.includes('.private.') ? 'private' : 'public');

// 방금 저장한 내용. Blob 목록은 저장 직후 몇 초 동안 새 파일을 빠뜨릴 수 있어서,
// 저장 후 30초 안에 목록에 아직 안 보이면 이 내용을 최신으로 쓴다 (연달아 저장할 때 앞의 저장이 사라지지 않게).
let last = null;

const blobStore = {
  ready: () => Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN),
  async load() {
    const { blobs } = await list({ prefix: PREFIX });
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    if (last && Date.now() - last.at < 30000 && !blobs.some((b) => b.url === last.url)) {
      return { items: last.items, versions: [last.url, ...blobs.map((b) => b.url)] };
    }
    if (!blobs.length) return { items: [], versions: [] };
    access = accessOf(blobs[0].url);
    const res = await get(blobs[0].url, { access, useCache: false });
    const data = res && res.stream ? await new Response(res.stream).json() : {};
    return { items: Array.isArray(data.items) ? data.items : [], versions: blobs.map((b) => b.url) };
  },
  async save(items, versions, keep) {
    const body = JSON.stringify({ items, savedAt: new Date().toISOString() });
    // 매번 새 이름으로 저장하므로 CDN 캐시 때문에 옛 내용이 보이는 일이 없다
    let blob;
    const write = async (a) => { blob = await put(`${PREFIX}.json`, body, { access: a, addRandomSuffix: true, contentType: 'application/json' }); };
    try {
      await write(access);
    } catch (err) {
      const other = access === 'private' ? 'public' : 'private';
      await write(other).catch(() => { throw err; });
      access = other;
    }
    last = { url: blob.url, items, at: Date.now() };
    // 다른 서버가 다음 요청을 받아도 새 파일을 보도록, 목록에 나타날 때까지 잠깐 기다린다 (최대 약 6초)
    for (let i = 0; i < 12; i += 1) {
      const { blobs } = await list({ prefix: PREFIX });
      if (blobs.some((b) => b.url === blob.url)) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    const stale = versions.slice(keep - 1);
    if (stale.length) await del(stale);
  },
};

export default createHandler(blobStore);
