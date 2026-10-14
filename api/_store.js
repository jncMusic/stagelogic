// 업무 흐름 데이터 저장소. Vercel Blob에 JSON 파일로 둔다 (점검표 API와 아침 요약 메일이 함께 쓴다).
// 필요한 환경 변수: CHECKLIST_PASSWORD, 그리고 Blob 저장소 연결로 자동 생기는 값
// (새 저장소는 BLOB_STORE_ID + OIDC, 예전 저장소는 BLOB_READ_WRITE_TOKEN)
import { put, list, del, get } from '@vercel/blob';

const PREFIX = 'checklist/state';

// 저장할 때마다 이름에 1씩 늘어나는 번호를 붙인다 (checklist/state-000000000042-xxxx.json).
// 1초 안에 연달아 저장하면 업로드 시각만으로는 어느 것이 최신인지 가릴 수 없어서다.
// 번호가 없는 예전 파일은 0번으로 본다.
const seqOf = (s) => Number((String(s).match(/state-(\d{12})/) || [])[1] || 0);
const newestFirst = (a, b) => seqOf(b.pathname) - seqOf(a.pathname) || new Date(b.uploadedAt) - new Date(a.uploadedAt);

// 저장소를 만들 때 고른 공개 범위(private/public)에 맞춰야 저장된다.
// 처음엔 private으로 시도하고, 거절되면 public 저장소로 보고 기억해 둔다.
let access = 'private';
const accessOf = (url) => (new URL(url).hostname.includes('.private.') ? 'private' : 'public');

// 방금 저장한 내용. Blob 목록은 저장 직후 몇 초 동안 새 파일을 빠뜨릴 수 있어서,
// 저장 후 30초 안에 목록에 아직 안 보이면 이 내용을 최신으로 쓴다 (연달아 저장할 때 앞의 저장이 사라지지 않게).
let last = null;

export const blobStore = {
  ready: () => Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN),
  async load() {
    const { blobs } = await list({ prefix: PREFIX });
    blobs.sort(newestFirst);
    if (last && Date.now() - last.at < 30000 && !blobs.some((b) => b.url === last.url)) {
      return { ...last.data, versions: [last.url, ...blobs.map((b) => b.url)] };
    }
    if (!blobs.length) return { items: [], versions: [] };
    access = accessOf(blobs[0].url);
    const res = await get(blobs[0].url, { access, useCache: false });
    const data = res && res.stream ? await new Response(res.stream).json() : {};
    return {
      items: Array.isArray(data.items) ? data.items : [],
      areas: Array.isArray(data.areas) ? data.areas : undefined,
      versions: blobs.map((b) => b.url),
    };
  },
  async save(data, versions, keep) {
    const body = JSON.stringify({ ...data, savedAt: new Date().toISOString() });
    // 매번 새 이름으로 저장하므로 CDN 캐시 때문에 옛 내용이 보이는 일이 없다
    const seq = String(seqOf(versions[0] || '') + 1).padStart(12, '0');
    let blob;
    const write = async (a) => { blob = await put(`${PREFIX}-${seq}.json`, body, { access: a, addRandomSuffix: true, contentType: 'application/json' }); };
    try {
      await write(access);
    } catch (err) {
      const other = access === 'private' ? 'public' : 'private';
      await write(other).catch(() => { throw err; });
      access = other;
    }
    last = { url: blob.url, data, at: Date.now() };
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

